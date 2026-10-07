import initDebug from 'debug';
import { EndOfStreamError } from 'strtok3';

import * as common from '../common/Util.js';
import { AbstractID3Parser } from '../id3v2/AbstractID3Parser.js';
import { AdtsFrameHeader } from './AdtsFrameHeader.js';
import { MpegContentError, MpegFrameHeader } from './MpegFrameHeader.js';
import { InfoTagHeaderTag, type IXingInfoTag, LameEncoderVersion, readXingHeader } from './XingTag.js';

const debug = initDebug('music-metadata:parser:mpeg');

export { MpegContentError } from './MpegFrameHeader.js';

/**
 * Cache buffer size used for searching synchronization preamble
 */
const maxPeekLen = 1024;

function getVbrCodecProfile(vbrScale: number): string {
  return `V${Math.floor((100 - vbrScale) / 10)}`;
}

export class MpegParser extends AbstractID3Parser {
  private frameCount = 0;
  private syncFrameCount = -1;
  private totalDataLength = 0;

  private audioFrameHeader?: MpegFrameHeader;
  private firstBitrate?: number;
  private constantBitrate = true;
  private offset = 0;
  private frameSize = 0;

  private calculateEofDuration = false;
  private samplesPerFrame: number | null = null;

  private frameHeaderBuffer = new Uint8Array(MpegFrameHeader.len);
  private frameHeaderTail = this.frameHeaderBuffer.subarray(1);
  private adtsHeaderBuffer = new Uint8Array(3);
  private sideInfoBuffer = new Uint8Array(32); // Maximum side information size (MPEG-1 stereo).

  /**
   * Number of bytes already parsed since beginning of stream / file
   */
  private mpegOffset: number | null = null;

  private syncPeek = {
    buf: new Uint8Array(maxPeekLen),
    len: 0
  };

  /**
   * Called after ID3 headers have been parsed
   */
  public async postId3v2Parse(): Promise<void> {
    this.metadata.setFormat('lossless', false);
    this.metadata.setAudioOnly();

    try {
      let quit = false;
      while (!quit) {
        await this.sync();
        quit = await this.parseFrameHeader();
      }
    } catch (err) {
      if (err instanceof EndOfStreamError) {
        debug('End-of-stream');
        if (this.calculateEofDuration) {
          if (this.samplesPerFrame !== null) {
            const numberOfSamples = this.frameCount * this.samplesPerFrame;
            this.metadata.setFormat('numberOfSamples', numberOfSamples);
            if (this.metadata.format.sampleRate) {
              const duration = numberOfSamples / this.metadata.format.sampleRate;
              debug(`Calculate duration at EOF: ${duration} sec.`, duration);
              this.metadata.setFormat('duration', duration);
            }
          }
        }
      } else {
        throw err;
      }
    }
  }

  /**
   * Called after file has been fully parsed, this allows, if present, to exclude the ID3v1.1 header length
   */
  protected finalize() {
    const format = this.metadata.format;
    const hasID3v1 = !!this.metadata.native.ID3v1;
    if (this.mpegOffset !== null) {
      if (format.duration && this.tokenizer.fileInfo.size) {
        const mpegSize = this.tokenizer.fileInfo.size - this.mpegOffset - (hasID3v1 ? 128 : 0);
        if (format.codecProfile && format.codecProfile[0] === 'V') {
          this.metadata.setFormat('bitrate', (mpegSize * 8) / format.duration);
        }
      }
      if (this.tokenizer.fileInfo.size && format.codecProfile === 'CBR') {
        const mpegSize = this.tokenizer.fileInfo.size - this.mpegOffset - (hasID3v1 ? 128 : 0);
        if (this.samplesPerFrame !== null) {
          const numberOfSamples = Math.round(mpegSize / this.frameSize) * this.samplesPerFrame;
          this.metadata.setFormat('numberOfSamples', numberOfSamples);
          if (format.sampleRate && !format.duration) {
            const duration = numberOfSamples / format.sampleRate;
            debug('Calculate CBR duration based on file size: %s', duration);
            this.metadata.setFormat('duration', duration);
          }
        }
      }
    }
  }

  private async sync(): Promise<void> {
    let gotFirstSync = false;

    while (true) {
      let bo = 0;
      this.syncPeek.len = await this.tokenizer.peekBuffer(this.syncPeek.buf, { length: maxPeekLen, mayBeLess: true });
      if (this.syncPeek.len <= 163) {
        throw new EndOfStreamError();
      }
      while (true) {
        if (gotFirstSync && (this.syncPeek.buf[bo] & 0xe0) === 0xe0) {
          this.frameHeaderBuffer[0] = 0xff;
          this.frameHeaderBuffer[1] = this.syncPeek.buf[bo];
          await this.tokenizer.ignore(bo);
          debug(`Sync at offset=${this.tokenizer.position - 1}, frameCount=${this.frameCount}`);
          if (this.syncFrameCount === this.frameCount) {
            debug(`Re-synced MPEG stream, frameCount=${this.frameCount}`);
            this.frameCount = 0;
            this.frameSize = 0;
          }
          this.syncFrameCount = this.frameCount;
          return; // sync
        }
        gotFirstSync = false;
        bo = this.syncPeek.buf.indexOf(0xff, bo);
        if (bo === -1) {
          if (this.syncPeek.len < this.syncPeek.buf.length) {
            throw new EndOfStreamError();
          }
          await this.tokenizer.ignore(this.syncPeek.len);
          break; // continue with next buffer
        }
        ++bo;
        gotFirstSync = true;
      }
    }
  }

  /**
   * Read the shared four-byte prefix, then dispatch to ADTS or MPEG audio.
   * @return {Promise<boolean>} true if parser should quit
   */
  private async parseFrameHeader(): Promise<boolean> {
    if (this.frameCount === 0) {
      this.mpegOffset = this.tokenizer.position - 1;
    }

    await this.tokenizer.peekBuffer(this.frameHeaderTail, { length: 3 });

    let header: MpegFrameHeader | AdtsFrameHeader;
    try {
      header = AdtsFrameHeader.matches(this.frameHeaderBuffer)
        ? new AdtsFrameHeader(this.frameHeaderBuffer)
        : new MpegFrameHeader(this.frameHeaderBuffer);
    } catch (err) {
      await this.tokenizer.ignore(1);
      if (err instanceof Error) {
        this.metadata.addWarning(`Parse error: ${err.message}`);
        return false; // sync
      }
      throw err;
    }
    await this.tokenizer.ignore(3);

    this.metadata.setFormat('container', header.container);
    this.metadata.setFormat('codec', header.codec);
    this.metadata.setFormat('lossless', false);
    this.metadata.setFormat('sampleRate', header.samplingRate);

    this.frameCount++;
    return header instanceof AdtsFrameHeader ? this.parseAdts(header) : this.parseMpegFrame(header);
  }

  /**
   * @return {Promise<boolean>} true if parser should quit
   */
  private async parseMpegFrame(header: MpegFrameHeader): Promise<boolean> {
    this.metadata.setFormat('numberOfChannels', header.numberOfChannels);
    this.metadata.setFormat('bitrate', header.bitrate);

    if (this.frameCount < 20 * 10000) {
      debug(
        'offset=%s MP%s bitrate=%s sample-rate=%s',
        this.tokenizer.position - 4,
        header.layer,
        header.bitrate,
        header.samplingRate
      );
    }
    this.frameSize = header.frameSize;
    this.audioFrameHeader = header;
    this.firstBitrate ??= header.bitrate;
    this.constantBitrate &&= header.bitrate === this.firstBitrate;

    // Xing/Info keeps the same offset even when CRC-protected: header + side information.
    // Its first-frame CRC is included in the skipped bytes; later frames skip CRC separately.
    // Ref: https://github.com/rbrito/lame/blob/master/libmp3lame/VbrTag.c#L866-L874
    if (this.frameCount === 1) {
      this.offset = MpegFrameHeader.len;
      await this.skipSideInformation();
      return false;
    }

    if (this.frameCount === 4) {
      // Treat the stream as CBR if all observed MPEG bitrates match.
      if (this.constantBitrate) {
        // Actual calculation will be done in finalize
        this.samplesPerFrame = header.samplesPerFrame;
        this.metadata.setFormat('codecProfile', 'CBR');
        if (this.tokenizer.fileInfo.size) {
          return true; // Will calculate duration based on the file size
        }
      } else if (this.metadata.format.duration) {
        return true; // We already got the duration, stop processing MPEG stream any further
      }
      if (!this.options.duration) {
        return true; // Enforce duration not enabled, stop processing entire stream
      }
    }

    // Count the remaining frames when a full duration scan is requested.
    if (this.options.duration && this.frameCount === 4) {
      this.samplesPerFrame = header.samplesPerFrame;
      this.calculateEofDuration = true;
    }

    this.offset = MpegFrameHeader.len;
    if (header.isProtectedByCRC) {
      await this.tokenizer.ignore(2);
      this.offset += 2;
    }
    await this.skipSideInformation();
    return false;
  }

  private async parseAdts(header: AdtsFrameHeader): Promise<boolean> {
    await this.tokenizer.readBuffer(this.adtsHeaderBuffer);
    const frameLength = header.frameLength + common.getBitAllignedNumber(this.adtsHeaderBuffer, 0, 0, 11);
    this.totalDataLength += frameLength;
    this.samplesPerFrame = 1024;

    if (header.samplingRate !== null) {
      const framesPerSec = header.samplingRate / this.samplesPerFrame;
      const bytesPerFrame = this.totalDataLength / this.frameCount;
      const bitrate = 8 * bytesPerFrame * framesPerSec + 0.5;
      this.metadata.setFormat('bitrate', bitrate);
      debug(`frame-count=${this.frameCount}, size=${frameLength} bytes, bit-rate=${bitrate}`);
    }

    await this.tokenizer.ignore(frameLength > 7 ? frameLength - 7 : 1);

    // Consume remaining header and frame data
    if (this.frameCount === 3) {
      this.metadata.setFormat('codecProfile', header.codecProfile);
      if (header.numberOfChannels) {
        this.metadata.setFormat('numberOfChannels', header.numberOfChannels);
      }
      if (this.options.duration) {
        this.calculateEofDuration = true;
      } else {
        return true; // Stop parsing after the third frame
      }
    }
    return false;
  }

  private async skipSideInformation(): Promise<void> {
    if (this.audioFrameHeader) {
      const sideInfoLength = this.audioFrameHeader.sideInfoLength;
      await this.tokenizer.readBuffer(this.sideInfoBuffer, { length: sideInfoLength });
      this.offset += sideInfoLength;
      await this.readXtraInfoHeader();
    }
  }

  private async readXtraInfoHeader(): Promise<IXingInfoTag | null> {
    const headerTag = await this.tokenizer.readToken(InfoTagHeaderTag);
    this.offset += InfoTagHeaderTag.len;

    switch (headerTag) {
      case 'Info':
        this.metadata.setFormat('codecProfile', 'CBR');
        return this.readXingInfoHeader();

      case 'Xing': {
        const infoTag = await this.readXingInfoHeader();
        if (infoTag.vbrScale !== null) {
          const codecProfile = getVbrCodecProfile(infoTag.vbrScale);
          this.metadata.setFormat('codecProfile', codecProfile);
        }
        return null;
      }

      case 'Xtra':
        // ToDo: ???
        break;

      case 'LAME': {
        const version = await this.tokenizer.readToken(LameEncoderVersion);
        if (this.frameSize >= this.offset + LameEncoderVersion.len) {
          this.offset += LameEncoderVersion.len;
          this.metadata.setFormat('tool', `LAME ${version}`);
          await this.skipFrameData(this.frameSize - this.offset);
          return null;
        }
        this.metadata.addWarning('Corrupt LAME header');
        break;
      }
      // ToDo: ???
    }

    const frameDataLeft = this.frameSize - this.offset;
    if (frameDataLeft < 0) {
      this.metadata.addWarning(`Frame ${this.frameCount}corrupt: negative frameDataLeft`);
    } else {
      await this.skipFrameData(frameDataLeft);
    }
    return null;
  }

  /**
   * Ref: http://gabriel.mp3-tech.org/mp3infotag.html
   */
  private async readXingInfoHeader(): Promise<IXingInfoTag> {
    const offset = this.tokenizer.position;
    const infoTag = await readXingHeader(this.tokenizer);
    this.offset += this.tokenizer.position - offset;

    if (infoTag.lame) {
      this.metadata.setFormat('tool', `LAME ${common.stripNulls(infoTag.lame.version)}`);
      if (infoTag.lame.extended) {
        this.metadata.setFormat('trackPeakLevel', infoTag.lame.extended.track_peak);
        if (infoTag.lame.extended.track_gain) {
          this.metadata.setFormat('trackGain', infoTag.lame.extended.track_gain.adjustment);
        }
        if (infoTag.lame.extended.album_gain) {
          this.metadata.setFormat('albumGain', infoTag.lame.extended.album_gain.adjustment);
        }
        this.metadata.setFormat('duration', infoTag.lame.extended.music_length / 1000);
      }
    }

    if (infoTag.streamSize && this.audioFrameHeader && infoTag.numFrames !== null) {
      const duration = (infoTag.numFrames * this.audioFrameHeader.samplesPerFrame) / this.audioFrameHeader.samplingRate;
      this.metadata.setFormat('duration', duration);
      debug('Get duration from Xing header: %s', this.metadata.format.duration);
      return infoTag;
    }

    // frames field is not present
    const frameDataLeft = this.frameSize - this.offset;

    await this.skipFrameData(frameDataLeft);
    return infoTag;
  }

  private async skipFrameData(frameDataLeft: number): Promise<void> {
    if (frameDataLeft < 0) {
      throw new MpegContentError('frame-data-left cannot be negative');
    }
    await this.tokenizer.ignore(frameDataLeft);
  }
}
