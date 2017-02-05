'use strict';

import * as strtok from 'strtok2';
import common from './common';
import {IStreamParser, TagCallback} from './parser';
import {HeaderType} from './tagmap';
import vorbis from './vorbis';

interface IState {

  parse(callback, data, done): IState;

  getExpectedType();
}

class FlacParser implements IStreamParser {

  public static headerType: HeaderType = 'vorbis';

  public static getInstance(): FlacParser {
    return new FlacParser();
  }

  public parse(stream, callback: TagCallback, done?, readDuration?, fileSize?) {
    let currentState: IState = startState;

    strtok.parse(stream, (v, cb) => {
      currentState = currentState.parse(callback, v, done);
      return currentState.getExpectedType();
    });
  }
}

/**
 * FLAC supports up to 128 kinds of metadata blocks; currently the following are defined:
 * ref: https://xiph.org/flac/format.html#metadata_block
 */
enum BlockType {
  STREAMINFO = 0,
  PADDING = 1,
  APPLICATION = 2,
  SEEKTABLE = 3,
  VORBIS_COMMENT = 4,
  CUESHEET = 5,
  PICTURE = 6
}

/**
 * METADATA_BLOCK_DATA
 * Ref: https://xiph.org/flac/format.html#metadata_block_streaminfo
 */
interface IBlockHeader {
  // Last-metadata-block flag: '1' if this block is the last metadata block before the audio blocks, '0' otherwise.
  lastBlock: boolean,
  // BLOCK_TYPE
  type: BlockType,
  // Length (in bytes) of metadata to follow (does not include the size of the METADATA_BLOCK_HEADER)
  length: number;
}

/**
 * METADATA_BLOCK_DATA
 * Ref: https://xiph.org/flac/format.html#metadata_block_streaminfo
 */
interface IBlockStreamInfo {
  minimumBlockSize: number,
  // The maximum block size (in samples) used in the stream.
  // (Minimum blocksize == maximum blocksize) implies a fixed-blocksize stream.
  maximumBlockSize: number,
  // The minimum frame size (in bytes) used in the stream.
  // May be 0 to imply the value is not known.
  minimumFrameSize: number,
  // The maximum frame size (in bytes) used in the stream.
  // May be 0 to imply the value is not known.
  maximumFrameSize: number,
  // Sample rate in Hz. Though 20 bits are available,
  // the maximum sample rate is limited by the structure of frame headers to 655350Hz.
  // Also, a value of 0 is invalid.
  sampleRate: number,
  // probably slower: sampleRate: common.getBitAllignedNumber(buf, off + 10, 0, 20),
  // (number of channels)-1. FLAC supports from 1 to 8 channels
  channels: number,
  // bits per sample)-1.
  // FLAC supports from 4 to 32 bits per sample. Currently the reference encoder and decoders only support up to 24 bits per sample.
  bitsPerSample: number,
  // Total samples in stream.
  // 'Samples' means inter-channel sample, i.e. one second of 44.1Khz audio will have 44100 samples regardless of the number of channels.
  // A value of zero here means the number of total samples is unknown.
  totalSamples: number,
  // the MD5 hash of the file (see notes for usage... it's a littly tricky)
  fileMD5: Buffer;
}

class Metadata {

  public static BlockHeader = {
    len: 4,

    get: (buf: Buffer, off: number): IBlockHeader => {
      return {
        lastBlock: common.strtokBITSET.get(buf, off, 7),
        type: common.getBitAllignedNumber(buf, off, 1, 7),
        length: common.strtokUINT24_BE.get(buf, off + 1)
      };
    }
  };

  /**
   * METADATA_BLOCK_DATA
   * Ref: https://xiph.org/flac/format.html#metadata_block_streaminfo
   */
  public static BlockStreamInfo = {
    len: 34,

    get: (buf: Buffer, off: number): IBlockStreamInfo => {
      return {
        // The minimum block size (in samples) used in the stream.
        minimumBlockSize: strtok.UINT16_BE.get(buf, off),
        // The maximum block size (in samples) used in the stream.
        // (Minimum blocksize == maximum blocksize) implies a fixed-blocksize stream.
        maximumBlockSize: strtok.UINT16_BE.get(buf, off + 2) / 1000,
        // The minimum frame size (in bytes) used in the stream.
        // May be 0 to imply the value is not known.
        minimumFrameSize: strtok.UINT24_BE.get(buf, off + 4),
        // The maximum frame size (in bytes) used in the stream.
        // May be 0 to imply the value is not known.
        maximumFrameSize: strtok.UINT24_BE.get(buf, off + 7),
        // Sample rate in Hz. Though 20 bits are available,
        // the maximum sample rate is limited by the structure of frame headers to 655350Hz.
        // Also, a value of 0 is invalid.
        sampleRate: common.strtokUINT24_BE.get(buf, off + 10) >> 4,
        // probably slower: sampleRate: common.getBitAllignedNumber(buf, off + 10, 0, 20),
        // (number of channels)-1. FLAC supports from 1 to 8 channels
        channels: common.getBitAllignedNumber(buf, off + 12, 4, 3) + 1,
        // bits per sample)-1.
        // FLAC supports from 4 to 32 bits per sample. Currently the reference encoder and decoders only support up to 24 bits per sample.
        bitsPerSample: common.getBitAllignedNumber(buf, off + 12, 7, 5) + 1,
        // Total samples in stream.
        // 'Samples' means inter-channel sample, i.e. one second of 44.1Khz audio will have 44100 samples regardless of the number of channels.
        // A value of zero here means the number of total samples is unknown.
        totalSamples: common.getBitAllignedNumber(buf, off + 13, 4, 36),
        // the MD5 hash of the file (see notes for usage... it's a littly tricky)
        fileMD5: new strtok.BufferType(16).get(buf, off + 18)
      };
    }
  };
}

class DataDecoder {

  private data: Buffer;
  private offset: number;

  constructor(data: Buffer) {
    this.data = data;
    this.offset = 0;
  }

  public readInt32(): number {
    const value = strtok.UINT32_LE.get(this.data, this.offset);
    this.offset += 4;
    return value;
  }

  public readStringUtf8(): string {
    const len = this.readInt32();
    const value = this.data.toString('utf8', this.offset, this.offset + len);
    this.offset += len;
    return value;
  }
}

// ToDo: same in ASF
const finishedState: IState = {

  parse: (callback) => {
    return finishedState; // ToDo: correct?
  },

  getExpectedType: () => {
    return strtok.DONE;
  }
};

class BlockDataState implements IState {

  private type: BlockType;
  private length: number;
  private nextStateFactory;

  constructor(type, length, nextStateFactory) {
    this.type = type;
    this.length = length;
    this.nextStateFactory = nextStateFactory;
  }

  public parse(callback, data) {
    switch (this.type) {
      case BlockType.STREAMINFO: // METADATA_BLOCK_STREAMINFO
        const blockStreamInfo = data as IBlockStreamInfo;
        // Ref: https://xiph.org/flac/format.html#metadata_block_streaminfo
        callback('format', 'dataformat', 'flac');
        callback('format', 'lossless', true);
        callback('format', 'headerType', FlacParser.headerType);
        callback('format', 'numberOfChannels', blockStreamInfo.channels);
        callback('format', 'bitsPerSample', blockStreamInfo.bitsPerSample);
        callback('format', 'sampleRate', blockStreamInfo.sampleRate);
        const duration = blockStreamInfo.totalSamples / blockStreamInfo.sampleRate;
        callback('format', 'duration', blockStreamInfo.totalSamples / blockStreamInfo.sampleRate);
        // callback('format', 'bitrate', fileSize / duration) // ToDo: exclude meta-data
        break;

      case BlockType.VORBIS_COMMENT: // METADATA_BLOCK_VORBIS_COMMENT
        const decoder = new DataDecoder(data);
        decoder.readStringUtf8(); // vendor (skip)
        const commentListLength = decoder.readInt32();
        for (let i = 0; i < commentListLength; i++) {
          const comment = decoder.readStringUtf8();
          const split = comment.split('=');
          callback(FlacParser.headerType, split[0].toUpperCase(), split[1]);
        }
        break;

      case BlockType.PICTURE: // METADATA_BLOCK_PICTURE
        const picture = vorbis.readPicture(data);
        callback(FlacParser.headerType, 'METADATA_BLOCK_PICTURE', picture);
        break;
    }
    return this.nextStateFactory();
  }

  public getExpectedType() {
    switch (this.type) {
      case 0:
        return Metadata.BlockStreamInfo;
      default:
        return new strtok.BufferType(this.length);
    }
  }
}

const blockHeaderState: IState = {
  parse: (callback, data, done) => {
    const header = data as IBlockHeader;
    const followingStateFactory = header.lastBlock ? () => {
      done();
      return finishedState;
    } : () => {
      return blockHeaderState;
    };

    return new BlockDataState(header.type, header.length, followingStateFactory);
  },
  getExpectedType: () => {
    return Metadata.BlockHeader;
  }
};

const idState: IState = {

  parse: (callback, data, done) => {
    if (data.toString() !== 'fLaC') {
      done(new Error('expected flac header but was not found'));
    }
    return blockHeaderState;
  },

  getExpectedType: () => {
    return new strtok.BufferType(4);
  }
};

const startState: IState = {

  parse: (callback) => {
    return idState;
  },

  getExpectedType: () => {
    return strtok.DONE;
  }
};

module.exports = FlacParser.getInstance();
