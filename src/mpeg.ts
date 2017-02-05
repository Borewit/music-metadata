'use strict';

import ReadableStream = NodeJS.ReadableStream;
import * as strtok from 'strtok2';
import {Token} from 'strtok2';
import common from './common';
import {Done, GetFileSize, IStreamParser, TagCallback} from './parser';

enum State {
  mpegSearchSync1 = 1,
  mpegSearchSync2 = 2,
  audio_frame_header = 3,
  CRC = 4,
  side_information = 5,
  xtra_info_header = 6,
  skip_frame_data = 7
}

/**
 * MPEG Audio Layer I/II/III frame header
 * Ref: https://www.mp3-tech.org/programmer/frame_header.html
 * Bit layout: AAAAAAAA AAABBCCD EEEEFFGH IIJJKLMM
 */
class MpegFrameHeader {

  public static SyncByte1 = 0xFF;
  public static SyncByte2 = 0xE0;

  public static VersionID = [2.5, null, 2, 1];
  public static LayerDescription = [null, 3, 2, 1];
  public static ChannelMode = ['stereo', 'joint_stereo', 'dual_channel', 'mono'];

  private static bitrate_index = {
    0x01: {11: 32, 12: 32, 13: 32, 21: 32, 22: 8, 23: 8},
    0x02: {11: 64, 12: 48, 13: 40, 21: 48, 22: 16, 23: 16},
    0x03: {11: 96, 12: 56, 13: 48, 21: 56, 22: 24, 23: 24},
    0x04: {11: 128, 12: 64, 13: 56, 21: 64, 22: 32, 23: 32},
    0x05: {11: 160, 12: 80, 13: 64, 21: 80, 22: 40, 23: 40},
    0x06: {11: 192, 12: 96, 13: 80, 21: 96, 22: 48, 23: 48},
    0x07: {11: 224, 12: 112, 13: 96, 21: 112, 22: 56, 23: 56},
    0x08: {11: 256, 12: 128, 13: 112, 21: 128, 22: 64, 23: 64},
    0x09: {11: 288, 12: 160, 13: 128, 21: 144, 22: 80, 23: 80},
    0x0A: {11: 320, 12: 192, 13: 160, 21: 160, 22: 96, 23: 96},
    0x0B: {11: 352, 12: 224, 13: 192, 21: 176, 22: 112, 23: 112},
    0x0C: {11: 384, 12: 256, 13: 224, 21: 192, 22: 128, 23: 128},
    0x0D: {11: 416, 12: 320, 13: 256, 21: 224, 22: 144, 23: 144},
    0x0E: {11: 448, 12: 384, 13: 320, 21: 256, 22: 160, 23: 160}
  };

  private static sampling_rate_freq_index = {
    1: {0x00: 44100, 0x01: 48000, 0x02: 32000},
    2: {0x00: 22050, 0x01: 24000, 0x02: 16000},
    2.5: {0x00: 11025, 0x01: 12000, 0x02: 8000}
  };

  // B(20,19): MPEG Audio versionIndex ID
  public versionIndex: number;
  // C(18,17): Layer description
  public layerIndex: number;
  // D(16): Protection bit
  public isProtectedByCRC: boolean;
  // E(15,12): Bitrate index
  public bitrateIndex: number;
  // F(11,10): Sampling rate frequency index
  public sampRateFreqIndex: number;
  // G(9): Padding bit
  public padding: boolean;
  // H(8): Private bit
  public privateBit: boolean;
  // I(7,6): Channel Mode
  public channelModeIndex: number;
  // J(5,4): Mode extension (Only used in Joint stereo)
  public modeExtension: number;
  // K(3): Copyright
  public isCopyrighted: boolean;
  // L(2): Original
  public isOriginalMedia: boolean;
  // M(3): The original bit indicates, if it is set, that the frame is located on its original media.
  public emphasis: number;

  public layer: number;
  public version: number;
  public channelMode: string;
  public bitrate: number;
  public samplingRate: number;

  public constructor(buf, off) {
    // B(20,19): MPEG Audio versionIndex ID
    this.versionIndex = common.getBitAllignedNumber(buf, off + 1, 3, 2);
    // C(18,17): Layer description
    this.layer = MpegFrameHeader.LayerDescription[common.getBitAllignedNumber(buf, off + 1, 5, 2)];
    // D(16): Protection bit (if true 16-bit CRC follows header)
    this.isProtectedByCRC = !common.isBitSet(buf, off + 1, 7);
    // E(15,12): Bitrate index
    this.bitrateIndex = common.getBitAllignedNumber(buf, off + 2, 0, 4);
    // F(11,10): Sampling rate frequency index
    this.sampRateFreqIndex = common.getBitAllignedNumber(buf, off + 2, 4, 2);
    // G(9): Padding bit
    this.padding = common.isBitSet(buf, off + 2, 6);
    // H(8): Private bit
    this.privateBit = common.isBitSet(buf, off + 2, 7);
    // I(7,6): Channel Mode
    this.channelModeIndex = common.getBitAllignedNumber(buf, off + 3, 0, 2);
    // J(5,4): Mode extension (Only used in Joint stereo)
    this.modeExtension = common.getBitAllignedNumber(buf, off + 3, 2, 2);
    // K(3): Copyright
    this.isCopyrighted = common.isBitSet(buf, off + 3, 4);
    // L(2): Original
    this.isOriginalMedia = common.isBitSet(buf, off + 3, 5);
    // M(3): The original bit indicates, if it is set, that the frame is located on its original media.
    this.emphasis = common.getBitAllignedNumber(buf, off + 3, 7, 2);

    this.version = MpegFrameHeader.VersionID[this.versionIndex];
    if (this.version === null)
      throw new Error('Invalid MPEG Audio version');

    this.channelMode = MpegFrameHeader.ChannelMode[this.channelModeIndex];
    this.samplingRate = this.calcSamplingRate();

    let bitrateInKbps = this.calcBitrate();
    this.bitrate = bitrateInKbps == null ? null : bitrateInKbps * 1000;
    this.samplingRate = this.calcSamplingRate();
  }

  public calcDuration(numFrames): number {
    return Math.round(numFrames * (this.calcSamplesPerFrame() / this.samplingRate));
  }

  public calcSamplesPerFrame(): number {
    if (this.layer === 1) return 384;
    if (this.layer === 2) return 1152;
    if (this.layer === 3 && this.version === 1) return 1152;
    if (this.layer === 3 && (this.version === 2 || this.version === 2.5)) return 576;
  }

  public calculateSideInfoLength(): number {
    if (this.layer !== 3) return 2;
    if (this.channelModeIndex === 3) {
      // mono
      if (this.version === 1) {
        return 17;
      } else if (this.version === 2 || this.version === 2.5) {
        return 9;
      }
    } else {
      if (this.version === 1) {
        return 32;
      } else if (this.version === 2 || this.version === 2.5) {
        return 17;
      }
    }
  }

  public calcSlotSize(): number {
    return [null, 4, 1, 1][this.layer];
  }

  private calcBitrate(): number {
    if (this.bitrateIndex === 0x00) return null; // free
    if (this.bitrateIndex === 0x0F) return null; // 'reserved'
    let mpegVersion: string = this.version.toString() + this.layer;
    return MpegFrameHeader.bitrate_index[this.bitrateIndex][mpegVersion];
  }

  private calcSamplingRate(): number {
    if (this.sampRateFreqIndex === 0x03) return null; // 'reserved'
    return MpegFrameHeader.sampling_rate_freq_index[this.version][this.sampRateFreqIndex];
  }
}

/**
 * MPEG Audio Layer I/II/III
 */
class MpegAudioLayer {

  public static FrameHeader = {
    len: 4,

    get: (buf, off): MpegFrameHeader => {
      return new MpegFrameHeader(buf, off);
    }
  };

  /**
   * Info Tag
   * Ref: http://gabriel.mp3-tech.org/mp3infotag.html
   */
  public static InfoTag = {
    len: 140,

    get: (buf, off) => {
      return {
        // 4 bytes for Header Tag
        headerTag: new strtok.StringType(4, 'ascii').get(buf, off),
        // 4 bytes for HeaderFlags
        headerFlags: new strtok.BufferType(4).get(buf, off + 4),

        // 100 bytes for entry (NUMTOCENTRIES)
        // numToCentries: new strtok.BufferType(100).get(buf, off + 8),
        // FRAME SIZE
        // frameSize: strtok.UINT32_BE.get(buf, off + 108),

        numFrames: strtok.UINT32_BE.get(buf, off + 8),

        numToCentries: new strtok.BufferType(100).get(buf, off + 108),

        // the number of header APE_HEADER bytes
        streamSize: strtok.UINT32_BE.get(buf, off + 112),
        // the number of header data bytes (from original file)
        vbrScale: strtok.UINT32_BE.get(buf, off + 116),

        /**
         * LAME Tag, extends the Xing header format
         * First added in LAME 3.12 for VBR
         * The modified header is also included in CBR files (effective LAME 3.94), with "Info" instead of "XING" near the beginning.
         */

        //  Initial LAME info, e.g.: LAME3.99r
        encoder: new strtok.StringType(9, 'ascii').get(buf, off + 120),
        //  Info Tag
        infoTag: strtok.UINT8.get(buf, off + 129) >> 4,
        // VBR method
        vbrMethod: strtok.UINT8.get(buf, off + 129) & 0xf
      };
    }
  };

  public static getVbrCodecProfile(vbrScale: number): string {
    return 'V' + (100 - vbrScale) / 10;
  }
}

export class MpegParser implements IStreamParser {

  private headerSize: number;

  private frameCount: number = 0;
  private state: State;

  private audioFrameHeader;
  private bitrates: number[] = [];
  private offset: number;
  private frame_size;
  private crc: number;

  private stream: NodeJS.ReadableStream;
  private tagEvent: TagCallback;
  private done: Done;
  private readDuration: boolean;
  private fileSize: GetFileSize;
  private frameSyncByte2: number;

  private calculateVbrDuration: boolean = false;

  public constructor(headerSize: number) {
    this.headerSize = headerSize;
  }

  public parse(stream: NodeJS.ReadableStream, tagEvent: TagCallback, done: Done, readDuration?: boolean, fileSize?: GetFileSize) {

    this.stream = stream;
    this.tagEvent = tagEvent;
    this.done = done;
    this.readDuration = readDuration;
    this.fileSize = fileSize;

    this.state = State.mpegSearchSync1;

    strtok.parse(stream, (v, cb) => {
      try {
        return this.strParse(v, cb)
      } catch (error) {
        return done(error);
      }
    });
  }

  public end(callback: TagCallback, done: Done) {
    if (this.calculateVbrDuration) {
      this.tagEvent('format', 'duration', this.audioFrameHeader.calcDuration(this.frameCount));
    }
    return done();
  }

  private strParse(v, cb) {
    if (v === undefined) {
      return strtok.UINT8;
    }

    switch (this.state) {

      case State.mpegSearchSync1:
        this.state = v === MpegFrameHeader.SyncByte1 ? State.mpegSearchSync2 : State.mpegSearchSync1;
        return strtok.UINT8;

      case State.mpegSearchSync2:
        if ((v & 0xE0) === 0xE0) {
          // Synchronized
          this.state = State.audio_frame_header;
          this.frameSyncByte2 = v;
          return new strtok.BufferType(2);
        } else {
          this.state = State.mpegSearchSync1;
          return strtok.UINT8;
        }

      /* falls through */
      case State.audio_frame_header: // audio frame header

        // we have found the mm tag at the end of the file, ignore
        /*
         if (v.slice(0, 3).toString() === 'TAG') {
         return done()
         }*/
        let buf_frame_header = new Buffer(4);
        v.copy(buf_frame_header, 2);
        buf_frame_header[0] = MpegFrameHeader.SyncByte1;
        buf_frame_header[1] = this.frameSyncByte2;
        let header = MpegAudioLayer.FrameHeader.get(buf_frame_header, 0);

        if (header.version === null || header.layer === null) {
          return this.seekFirstAudioFrame();
        }

        // mp3 files are only found in MPEG1/2 Layer 3
        if (( header.version !== 1 && header.version !== 2) || header.layer !== 3) {
          return this.seekFirstAudioFrame();
        }

        if (header.bitrate == null) {
          return this.seekFirstAudioFrame();
        }

        if (header.samplingRate == null) {
          return this.seekFirstAudioFrame();
        }

        this.tagEvent('format', 'dataformat', 'mp3');
        this.tagEvent('format', 'lossless', false);
        this.tagEvent('format', 'bitrate', header.bitrate);
        this.tagEvent('format', 'sampleRate', header.samplingRate);
        this.tagEvent('format', 'numberOfChannels', header.channelMode === 'mono' ? 1 : 2);

        let slot_size = header.calcSlotSize();
        if (slot_size == null) {
          this.done(new Error('invalid slot_size'));
        }

        let samples_per_frame = header.calcSamplesPerFrame();
        let bps = samples_per_frame / 8.0;
        let fsize = (bps * header.bitrate / header.samplingRate) +
          ((header.padding) ? slot_size : 0);
        this.frame_size = Math.floor(fsize);

        this.audioFrameHeader = header;
        this.frameCount++;
        this.bitrates.push(header.bitrate);

        // xtra header only exists in first frame
        if (this.frameCount === 1) {
          this.offset = MpegAudioLayer.FrameHeader.len;
          return this.skipSideInformation(header);
        }

        if (this.fileSize && this.frameCount === 3) {
          // the stream is CBR if the first 3 frame bitrates are the same
          if (this.areAllSame(this.bitrates)) {
            this.fileSize((size) => {
              // subtract non audio stream data from duration calculation
              size = size - this.headerSize;
              this.tagEvent('format', 'duration', (size * 8) / header.bitrate);
              // cb(done())
              return this.done();
            });
            return strtok.DEFER;
          } else if (!this.readDuration) {
            return this.done();
          }
        }

        // once we know the file is VBR attach listener to end of
        // stream so we can do the duration calculation when we
        // have counted all the frames
        if (this.readDuration && this.frameCount === 4) {
          return this.calculateVbrDuration = true;
        }

        this.offset = 4;
        if (header.isProtectedByCRC) {
          this.state = State.CRC;
          return strtok.INT16_BE;
        } else {
          return this.skipSideInformation(header);
        }

      case State.CRC:
        this.offset += 2;
        this.crc = v;
        return this.skipSideInformation(this.audioFrameHeader);

      case State.side_information: // side information
        this.offset += MpegAudioLayer.InfoTag.len;  // 12
        this.state = State.xtra_info_header;
        return MpegAudioLayer.InfoTag;

      case State.xtra_info_header: // xtra / info header
        this.state = State.skip_frame_data;
        let frameDataLeft = this.frame_size - this.offset;

        let codecProfile: string;
        switch (v.headerTag) {
          case 'Info':
            codecProfile = 'CBR';
            break;
          case 'Xing':
            codecProfile = MpegAudioLayer.getVbrCodecProfile(v.vbrScale);
            break;
          case 'Xtra':
            // ToDo: ???
            break;
          default:
            return new strtok.IgnoreType(frameDataLeft);
        }

        this.tagEvent('format', 'encoder', v.encoder);
        this.tagEvent('format', 'codecProfile', codecProfile);

        // frames field is not present
        if ((v.headerFlags[3] & 0x01) !== 1) {
          return new strtok.IgnoreType(frameDataLeft);
        }

        this.tagEvent('format', 'duration', this.audioFrameHeader.calcDuration(v.numFrames));
        return this.done();

      case State.skip_frame_data: // skip frame data
        this.state = State.mpegSearchSync1;
        return strtok.UINT8;

      default:
        this.done(new Error('Undefined state: ' + this.state));
    }
  }

  private skipSideInformation(header: MpegFrameHeader) {
    let sideinfo_length = header.calculateSideInfoLength();

    this.offset += sideinfo_length;
    this.state = State.side_information;
    return new strtok.BufferType(sideinfo_length);
  }

  private seekFirstAudioFrame(): Token {
    if (this.frameCount > 0) {
      return this.done(new Error('expected frame header but was not found'));
    }
    this.state = State.mpegSearchSync1;
    return strtok.UINT8;
  }

  private areAllSame(array) {
    let first = array[0];
    return array.every((element) => {
      return element === first;
    });
  }
}
