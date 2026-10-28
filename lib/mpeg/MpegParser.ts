import initDebug from 'debug';
import { EndOfStreamError, isRandomAccessTokenizer } from 'strtok3';

import * as common from '../common/Util.js';
import { hasID3v1Header } from '../id3v1/ID3v1Parser.js';
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
  private audioEnd?: number;

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
    if (this.options.duration && isRandomAccessTokenizer(this.tokenizer)) {
      this.audioEnd = this.tokenizer.fileInfo.size - ((await hasID3v1Header(this.tokenizer)) ? 128 : 0);
    }

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
      if (this.tokenizer.fileInfo.size && format.codecProfile === 'CBR' && !this.calculateEofDuration) {
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
      if (this.syncPeek.len >= 128 && this.syncPeek.len < maxPeekLen) {
        const footer = this.syncPeek.len - 128;
        const end = this.tokenizer.position + this.syncPeek.len;
        if (
          (this.tokenizer.fileInfo.size === undefined || this.tokenizer.fileInfo.size === end) &&
          this.syncPeek.buf[footer] === 0x54 &&
          this.syncPeek.buf[footer + 1] === 0x41 &&
          this.syncPeek.buf[footer + 2] === 0x47
        ) {
          this.audioEnd = end - 128;
        }
      }
      const fullMpegScan = this.calculateEofDuration && this.audioFrameHeader !== undefined;
      const id3v1Tail =
        this.syncPeek.len >= 3 &&
        this.syncPeek.buf[0] === 0x54 &&
        this.syncPeek.buf[1] === 0x41 &&
        this.syncPeek.buf[2] === 0x47;
      if (
        this.syncPeek.len < 2 ||
        (this.syncPeek.len <= 163 && this.audioFrameHeader !== undefined && (!fullMpegScan || id3v1Tail))
      ) {
        throw new EndOfStreamError();
      }
      while (true) {
        if (gotFirstSync && bo === this.syncPeek.len) {
          // Keep a possible sync byte at the end of a lookahead buffer.
          await this.tokenizer.ignore(bo - 1);
          gotFirstSync = false;
          break;
        }
        if (gotFirstSync && (this.syncPeek.buf[bo] & 0xe0) === 0xe0) {
          this.frameHeaderBuffer[0] = 0xff;
          this.frameHeaderBuffer[1] = this.syncPeek.buf[bo];
          // Retain the MPEG tail policy; a complete ADTS frame can be much smaller.
          if (
            this.syncPeek.len <= 163 &&
            !AdtsFrameHeader.matches(this.frameHeaderBuffer) &&
            (!fullMpegScan || id3v1Tail)
          ) {
            throw new EndOfStreamError();
          }
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
    if (
      header instanceof MpegFrameHeader &&
      this.options.duration &&
      this.audioEnd !== undefined &&
      this.tokenizer.position - 1 + header.frameSize > this.audioEnd
    ) {
      throw new EndOfStreamError();
    }
    await this.tokenizer.ignore(3);

    if (header instanceof AdtsFrameHeader) {
      this.metadata.setFormat('container', header.container);
      this.metadata.setFormat('codec', header.codec);
      this.metadata.setFormat('lossless', false);
      return this.parseAdts(header);
    }

    this.metadata.setFormat('container', header.container);
    this.metadata.setFormat('codec', header.codec);
    this.metadata.setFormat('lossless', false);
    this.frameCount++;
    try {
      return await this.parseMpegFrame(header);
    } catch (error) {
      if (error instanceof EndOfStreamError) {
        --this.frameCount;
      }
      throw error;
    }
  }

  /**
   * @return {Promise<boolean>} true if parser should quit
   */
  private async parseMpegFrame(header: MpegFrameHeader): Promise<boolean> {
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

    // Xing/Info keeps the same offset even when CRC-protected: header + side information.
    // Its first-frame CRC is included in the skipped bytes; later frames skip CRC separately.
    // Ref: https://github.com/rbrito/lame/blob/master/libmp3lame/VbrTag.c#L866-L874
    if (this.frameCount === 1) {
      this.offset = MpegFrameHeader.len;
      await this.skipSideInformation();
      this.applyMpegFormat(header);
      return false;
    }

    if (this.frameCount === 4) {
      this.samplesPerFrame = header.samplesPerFrame;
      if (this.metadata.format.duration) {
        this.applyMpegFormat(header);
        return true;
      }
      if (!this.options.duration) {
        this.applyMpegFormat(header);
      }
      // Treat the stream as CBR if all observed MPEG bitrates match.
      if (this.constantBitrate) {
        // Actual calculation will be done in finalize
        this.samplesPerFrame = header.samplesPerFrame;
        this.metadata.setFormat('codecProfile', 'CBR');
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
    this.applyMpegFormat(header);
    if (this.calculateEofDuration && !this.constantBitrate && this.metadata.format.codecProfile === 'CBR') {
      this.metadata.setFormat('codecProfile', 'VBR');
    }
    return false;
  }

  private applyMpegFormat(header: MpegFrameHeader): void {
    this.metadata.setFormat('container', header.container);
    this.metadata.setFormat('codec', header.codec);
    this.metadata.setFormat('lossless', false);
    this.metadata.setFormat('sampleRate', header.samplingRate);
    this.metadata.setFormat('numberOfChannels', header.numberOfChannels);
    this.metadata.setFormat('bitrate', header.bitrate);
    this.firstBitrate ??= header.bitrate;
    this.constantBitrate &&= header.bitrate === this.firstBitrate;
  }

  private async parseAdts(header: AdtsFrameHeader): Promise<boolean> {
    await this.tokenizer.readBuffer(this.adtsHeaderBuffer);
    const frameLength = header.frameLength + common.getBitAllignedNumber(this.adtsHeaderBuffer, 0, 0, 11);
    if (frameLength <= header.headerLength) {
      throw new MpegContentError(`Invalid ADTS frame length: ${frameLength}`);
    }
    const remaining = frameLength - 7;
    if (isRandomAccessTokenizer(this.tokenizer)) {
      // Verify the physical end even when a custom tokenizer advertises an inaccurate size.
      const count = await this.tokenizer.readBuffer(this.adtsHeaderBuffer, {
        position: this.tokenizer.position + remaining - 1,
        length: 1
      });
      if (count !== 1) {
        throw new EndOfStreamError();
      }
    } else if ((await this.tokenizer.ignore(remaining)) !== remaining) {
      throw new EndOfStreamError();
    }
    // Do not let a rejected partial frame override the rate of complete frames.
    this.metadata.setFormat('sampleRate', header.samplingRate ?? undefined);
    // Only complete frames contribute samples, including clips shorter than three frames.
    this.frameCount++;
    this.totalDataLength += frameLength;
    this.samplesPerFrame = 1024;
    this.calculateEofDuration = this.options.duration ?? false;

    if (header.samplingRate !== null) {
      const framesPerSec = header.samplingRate / this.samplesPerFrame;
      const bytesPerFrame = this.totalDataLength / this.frameCount;
      const bitrate = 8 * bytesPerFrame * framesPerSec + 0.5;
      this.metadata.setFormat('bitrate', bitrate);
      debug(`frame-count=${this.frameCount}, size=${frameLength} bytes, bit-rate=${bitrate}`);
    }

    if (this.frameCount === 1) {
      this.metadata.setFormat('codecProfile', header.codecProfile);
      if (header.numberOfChannels) {
        this.metadata.setFormat('numberOfChannels', header.numberOfChannels);
      }
    }
    return this.frameCount === 3 && !this.options.duration;
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
        this.metadata.setFormat('trackPeakLevel', infoTag.lame.extended.track_peak ?? undefined);
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
    if (frameDataLeft > 0 && this.calculateEofDuration && isRandomAccessTokenizer(this.tokenizer)) {
      const count = await this.tokenizer.readBuffer(this.sideInfoBuffer, {
        position: this.tokenizer.position + frameDataLeft - 1,
        length: 1
      });
      if (count !== 1) {
        throw new EndOfStreamError();
      }
    } else if ((await this.tokenizer.ignore(frameDataLeft)) !== frameDataLeft) {
      throw new EndOfStreamError();
    }
  }
}
