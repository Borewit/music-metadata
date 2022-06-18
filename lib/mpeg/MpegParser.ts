import * as Token from "../token-types";
import { EndOfStreamError } from "../strtok3";
import initDebug from "debug";

import * as common from "../common/Util";
import { AbstractID3Parser } from "../id3v2/AbstractID3Parser";
import { InfoTagHeaderTag, LameEncoderVersion } from "./XingTag";
import { IXingInfoTag, readXingHeader } from "./XingInfoTag";
import { FrameHeader, MpegFrameHeader } from "./MpegFrameHeader";

const debug = initDebug("music-metadata:parser:mpeg");

/**
 * Cache buffer size used for searching synchronization preabmle
 */
const maxPeekLen = 1024;

/**
 *
 * @param vbrScale
 * @returns
 */
function getVbrCodecProfile(vbrScale: number): string {
  return "V" + Math.floor((100 - vbrScale) / 10);
}

export class MpegParser extends AbstractID3Parser {
  private frameCount: number = 0;
  private syncFrameCount: number = -1;
  private countSkipFrameData: number = 0;
  private totalDataLength = 0;

  private audioFrameHeader: MpegFrameHeader;
  private bitrates: number[] = [];
  private offset: number;
  private frame_size: number;
  private crc: number;

  private calculateEofDuration: boolean = false;
  private samplesPerFrame: number;

  private buf_frame_header = Buffer.alloc(4);

  /**
   * Number of bytes already parsed since beginning of stream / file
   */
  private mpegOffset: number;

  private syncPeek = {
    buf: Buffer.alloc(maxPeekLen),
    len: 0,
  };

  /**
   * Called after ID3 headers have been parsed
   */
  public async postId3v2Parse(): Promise<void> {
    this.metadata.setFormat("lossless", false);

    try {
      let quit = false;
      while (!quit) {
        await this.sync();
        quit = await this.parseCommonMpegHeader();
      }
    } catch (error) {
      if (error instanceof EndOfStreamError) {
        debug(`End-of-stream`);
        if (this.calculateEofDuration) {
          const numberOfSamples = this.frameCount * this.samplesPerFrame;
          this.metadata.setFormat("numberOfSamples", numberOfSamples);
          const duration = numberOfSamples / this.metadata.format.sampleRate;
          debug(`Calculate duration at EOF: ${duration} sec.`, duration);
          this.metadata.setFormat("duration", duration);
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Called after file has been fully parsed, this allows, if present, to exclude the ID3v1.1 header length
   */
  protected override finalize() {
    const format = this.metadata.format;
    const hasID3v1 = Object.prototype.hasOwnProperty.call(
      this.metadata.native,
      "ID3v1"
    );
    if (format.duration && this.tokenizer.fileInfo.size > 0) {
      const mpegSize =
        this.tokenizer.fileInfo.size - this.mpegOffset - (hasID3v1 ? 128 : 0);
      if (format.codecProfile && format.codecProfile[0] === "V") {
        this.metadata.setFormat("bitrate", (mpegSize * 8) / format.duration);
      }
    } else if (
      this.tokenizer.fileInfo.size > 0 &&
      format.codecProfile === "CBR"
    ) {
      const mpegSize =
        this.tokenizer.fileInfo.size - this.mpegOffset - (hasID3v1 ? 128 : 0);
      const numberOfSamples =
        Math.round(mpegSize / this.frame_size) * this.samplesPerFrame;
      this.metadata.setFormat("numberOfSamples", numberOfSamples);
      const duration = numberOfSamples / format.sampleRate;
      debug("Calculate CBR duration based on file size: %s", duration);
      this.metadata.setFormat("duration", duration);
    }
  }

  private async sync(): Promise<void> {
    let gotFirstSync = false;

    while (true) {
      let bo = 0;
      this.syncPeek.len = await this.tokenizer.peekBuffer(this.syncPeek.buf, {
        length: maxPeekLen,
        mayBeLess: true,
      });
      if (this.syncPeek.len <= 163) {
        throw new EndOfStreamError();
      }
      while (true) {
        if (gotFirstSync && (this.syncPeek.buf[bo] & 0xe0) === 0xe0) {
          this.buf_frame_header[0] = MpegFrameHeader.SyncByte1;
          this.buf_frame_header[1] = this.syncPeek.buf[bo];
          await this.tokenizer.ignore(bo);
          debug(
            `Sync at offset=${this.tokenizer.position - 1}, frameCount=${
              this.frameCount
            }`
          );
          if (this.syncFrameCount === this.frameCount) {
            debug(`Re-synced MPEG stream, frameCount=${this.frameCount}`);
            this.frameCount = 0;
            this.frame_size = 0;
          }
          this.syncFrameCount = this.frameCount;
          return; // sync
        } else {
          gotFirstSync = false;
          bo = this.syncPeek.buf.indexOf(MpegFrameHeader.SyncByte1, bo);
          if (bo === -1) {
            if (this.syncPeek.len < this.syncPeek.buf.length) {
              throw new EndOfStreamError();
            }
            await this.tokenizer.ignore(this.syncPeek.len);
            break; // continue with next buffer
          } else {
            ++bo;
            gotFirstSync = true;
          }
        }
      }
    }
  }

  /**
   * Combined ADTS & MPEG (MP2 & MP3) header handling
   * @returns {Promise<boolean>} true if parser should quit
   */
  private async parseCommonMpegHeader(): Promise<boolean> {
    if (this.frameCount === 0) {
      this.mpegOffset = this.tokenizer.position - 1;
    }

    await this.tokenizer.peekBuffer(this.buf_frame_header, {
      offset: 1,
      length: 3,
    });

    let header: MpegFrameHeader;
    try {
      header = FrameHeader.get(this.buf_frame_header, 0);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
      await this.tokenizer.ignore(1);
      this.metadata.addWarning("Parse error: " + error.message);
      return false; // sync
    }
    await this.tokenizer.ignore(3);

    this.metadata.setFormat("container", header.container);
    this.metadata.setFormat("codec", header.codec);
    this.metadata.setFormat("lossless", false);
    this.metadata.setFormat("sampleRate", header.samplingRate);

    this.frameCount++;
    return header.version >= 2 && header.layer === 0
      ? this.parseAdts(header)
      : this.parseAudioFrameHeader(header);
  }

  /**
   * @param header
   * @returns {Promise<boolean>} true if parser should quit
   */
  private async parseAudioFrameHeader(
    header: MpegFrameHeader
  ): Promise<boolean> {
    this.metadata.setFormat(
      "numberOfChannels",
      header.channelMode === "mono" ? 1 : 2
    );
    this.metadata.setFormat("bitrate", header.bitrate);

    if (this.frameCount < 20 * 10_000) {
      debug(
        "offset=%s MP%s bitrate=%s sample-rate=%s",
        this.tokenizer.position - 4,
        header.layer,
        header.bitrate,
        header.samplingRate
      );
    }
    const slot_size = header.calcSlotSize();
    if (slot_size === null) {
      throw new Error("invalid slot_size");
    }

    const samples_per_frame = header.calcSamplesPerFrame();
    debug(`samples_per_frame=${samples_per_frame}`);
    const bps = samples_per_frame / 8;
    const fsize =
      (bps * header.bitrate) / header.samplingRate +
      (header.padding ? slot_size : 0);
    this.frame_size = Math.floor(fsize);

    this.audioFrameHeader = header;
    this.bitrates.push(header.bitrate);

    // xtra header only exists in first frame
    if (this.frameCount === 1) {
      this.offset = FrameHeader.len;
      await this.skipSideInformation();
      return false;
    }

    if (this.frameCount === 3) {
      // the stream is CBR if the first 3 frame bitrates are the same
      if (this.areAllSame(this.bitrates)) {
        // Actual calculation will be done in finalize
        this.samplesPerFrame = samples_per_frame;
        this.metadata.setFormat("codecProfile", "CBR");
        if (this.tokenizer.fileInfo.size > 0) return true; // Will calculate duration based on the file size
      } else if (this.metadata.format.duration) {
        return true; // We already got the duration, stop processing MPEG stream any further
      }
      if (!this.options.duration) {
        return true; // Enforce duration not enabled, stop processing entire stream
      }
    }

    // once we know the file is VBR attach listener to end of
    // stream so we can do the duration calculation when we
    // have counted all the frames
    if (this.options.duration && this.frameCount === 4) {
      this.samplesPerFrame = samples_per_frame;
      this.calculateEofDuration = true;
    }

    this.offset = 4;
    if (header.isProtectedByCRC) {
      await this.parseCrc();
      return false;
    } else {
      await this.skipSideInformation();
      return false;
    }
  }

  private async parseAdts(header: MpegFrameHeader): Promise<boolean> {
    const buf = Buffer.alloc(3);
    await this.tokenizer.readBuffer(buf);
    header.frameLength += common.getBitAllignedNumber(buf, 0, 0, 11);
    this.totalDataLength += header.frameLength;
    this.samplesPerFrame = 1024;

    const framesPerSec = header.samplingRate / this.samplesPerFrame;
    const bytesPerFrame =
      this.frameCount === 0 ? 0 : this.totalDataLength / this.frameCount;
    const bitrate = 8 * bytesPerFrame * framesPerSec + 0.5;
    this.metadata.setFormat("bitrate", bitrate);

    debug(
      `frame-count=${this.frameCount}, size=${header.frameLength} bytes, bit-rate=${bitrate}`
    );
    await this.tokenizer.ignore(
      header.frameLength > 7 ? header.frameLength - 7 : 1
    );

    // Consume remaining header and frame data
    if (this.frameCount === 3) {
      this.metadata.setFormat("codecProfile", header.codecProfile);
      if (header.mp4ChannelConfig) {
        this.metadata.setFormat(
          "numberOfChannels",
          header.mp4ChannelConfig.length
        );
      }
      if (this.options.duration) {
        this.calculateEofDuration = true;
      } else {
        return true; // Stop parsing after the third frame
      }
    }
    return false;
  }

  private async parseCrc(): Promise<void> {
    this.crc = await this.tokenizer.readNumber(Token.INT16_BE);
    this.offset += 2;
    return this.skipSideInformation();
  }

  private async skipSideInformation(): Promise<void> {
    const sideinfo_length = this.audioFrameHeader.calculateSideInfoLength();
    // side information
    await this.tokenizer.readToken(new Token.Uint8ArrayType(sideinfo_length));
    this.offset += sideinfo_length;
    await this.readXtraInfoHeader();
    return;
  }

  private async readXtraInfoHeader(): Promise<IXingInfoTag> {
    const headerTag = await this.tokenizer.readToken(InfoTagHeaderTag);
    this.offset += InfoTagHeaderTag.len; // 12

    switch (headerTag) {
      case "Info": {
        this.metadata.setFormat("codecProfile", "CBR");
        return this.readXingInfoHeader();
      }
      case "Xing": {
        const infoTag = await this.readXingInfoHeader();
        const codecProfile = getVbrCodecProfile(infoTag.vbrScale);
        this.metadata.setFormat("codecProfile", codecProfile);
        return null;
      }

      case "Xtra": {
        // ToDo: ???
        break;
      }

      case "LAME": {
        const version = await this.tokenizer.readToken(LameEncoderVersion);
        if (this.frame_size >= this.offset + LameEncoderVersion.len) {
          this.offset += LameEncoderVersion.len;
          this.metadata.setFormat("tool", "LAME " + version);
          await this.skipFrameData(this.frame_size - this.offset);
          return null;
        } else {
          this.metadata.addWarning("Corrupt LAME header");
          break;
        }
      }
      // ToDo: ???
    }

    // ToDo: promise duration???
    const frameDataLeft = this.frame_size - this.offset;
    if (frameDataLeft < 0) {
      this.metadata.addWarning(
        "Frame " + this.frameCount + "corrupt: negative frameDataLeft"
      );
    } else {
      await this.skipFrameData(frameDataLeft);
    }
    return null;
  }

  /**
   * Ref: http://gabriel.mp3-tech.org/mp3infotag.html
   * @returns {Promise<string>}
   */
  private async readXingInfoHeader(): Promise<IXingInfoTag> {
    const offset = this.tokenizer.position;
    const infoTag = await readXingHeader(this.tokenizer);
    this.offset += this.tokenizer.position - offset;

    if (infoTag.lame) {
      this.metadata.setFormat(
        "tool",
        "LAME " + common.stripNulls(infoTag.lame.version)
      );
      if (infoTag.lame.extended) {
        // this.metadata.setFormat('trackGain', infoTag.lame.extended.track_gain);
        this.metadata.setFormat(
          "trackPeakLevel",
          infoTag.lame.extended.track_peak
        );
        if (infoTag.lame.extended.track_gain) {
          this.metadata.setFormat(
            "trackGain",
            infoTag.lame.extended.track_gain.adjustment
          );
        }
        if (infoTag.lame.extended.album_gain) {
          this.metadata.setFormat(
            "albumGain",
            infoTag.lame.extended.album_gain.adjustment
          );
        }
        this.metadata.setFormat(
          "duration",
          infoTag.lame.extended.music_length / 1000
        );
      }
    }

    if (infoTag.streamSize) {
      const duration = this.audioFrameHeader.calcDuration(infoTag.numFrames);
      this.metadata.setFormat("duration", duration);
      debug("Get duration from Xing header: %s", this.metadata.format.duration);
      return infoTag;
    }

    // frames field is not present
    const frameDataLeft = this.frame_size - this.offset;

    await this.skipFrameData(frameDataLeft);
    return infoTag;
  }

  private async skipFrameData(frameDataLeft: number): Promise<void> {
    if (frameDataLeft < 0)
      throw new Error("frame-data-left cannot be negative");
    await this.tokenizer.ignore(frameDataLeft);
    this.countSkipFrameData += frameDataLeft;
  }

  private areAllSame(array: number[]) {
    const first = array[0];
    return array.every((element) => {
      return element === first;
    });
  }
}
