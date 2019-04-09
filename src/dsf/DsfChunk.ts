import * as Token from 'token-types';
import {FourCcToken} from '../common/FourCC';

/**
 * Common interface for the common chunk DSD header
 */
export interface IChunkHeader {

  /**
   * Chunk ID
   */
  id: string;

  /**
   * Chunk size
   */
  size: number;
}

/**
 * Common chunk DSD header: the 'chunk name (Four-CC)' & chunk size
 */
export const ChunkHeader: Token.IGetToken<IChunkHeader> = {
  len: 12,

  get: (buf: Buffer, off: number): IChunkHeader => {
    return {id: FourCcToken.get(buf, off), size: Token.UINT64_LE.get(buf, off + 4)};
  }
};

/**
 * Interface to DSD payload chunk
 */
export interface IDsdChunk {

  /**
   * Total file size
   */
  fileSize: number;

  /**
   * If Metadata doesn’t exist, set 0. If the file has ID3v2 tag, then set the pointer to it.
   * ID3v2 tag should be located in the end of the file.
   */
  metadataPointer: number;
}

/**
 * Common chunk DSD header: the 'chunk name (Four-CC)' & chunk size
 */
export const DsdChunk: Token.IGetToken<IDsdChunk> = {
  len: 16,

  get: (buf: Buffer, off: number): IDsdChunk => {
    return {
      fileSize: Token.INT64_LE.get(buf, off),
      metadataPointer: Token.INT64_LE.get(buf, off + 8)
  }
    ;
  }
};

export enum ChannelType {
  mono = 1,
  stereo = 2,
  channels = 3,
  quad = 4,
  '4 channels' = 5,
  '5 channels' = 6,
  '5.1 channels' = 7
}

/**
 * Interface to format chunk payload chunk
 */
export interface IFormatChunk {

  /**
   * Version of this file format
   */
  formatVersion: number;

  /**
   * Format ID
   */
  formatID: number;

  /**
   * Channel Type
   */
  channelType: ChannelType;

  /**
   * Channel num
   */
  channelNum: number;

  /**
   * Sampling frequency
   */
  samplingFrequency: number;

  /**
   * Bits per sample
   */
  bitsPerSample: number;

  /**
   * Sample count
   */
  sampleCount: number;

  /**
   * Block size per channel
   */
  blockSizePerChannel: number;
}

/**
 * Common chunk DSD header: the 'chunk name (Four-CC)' & chunk size
 */
export const FormatChunk: Token.IGetToken<IFormatChunk> = {
  len: 40,

  get: (buf: Buffer, off: number): IFormatChunk => {
    return {
      formatVersion: Token.INT32_LE.get(buf, off),
      formatID: Token.INT32_LE.get(buf, off + 4),
      channelType: Token.INT32_LE.get(buf, off + 8),
      channelNum: Token.INT32_LE.get(buf, off + 12),
      samplingFrequency: Token.INT32_LE.get(buf, off + 16),
      bitsPerSample: Token.INT32_LE.get(buf, off + 20),
      sampleCount: Token.INT64_LE.get(buf, off + 24),
      blockSizePerChannel: Token.INT32_LE.get(buf, off + 32)
    };
  }
};
