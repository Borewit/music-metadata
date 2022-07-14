import * as Token from "../token-types";
import { IGetToken } from "../strtok3";

export enum ChannelType {
  mono = 1,
  stereo = 2,
  channels = 3,
  quad = 4,
  "4 channels" = 5,
  "5 channels" = 6,
  "5.1 channels" = 7,
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
  sampleCount: bigint;

  /**
   * Block size per channel
   */
  blockSizePerChannel: number;
}

/**
 * Common chunk DSD header: the 'chunk name (Four-CC)' & chunk size
 */
export const FormatChunk: IGetToken<IFormatChunk> = {
  len: 40,

  get: (buf: Uint8Array, off: number): IFormatChunk => {
    return {
      formatVersion: Token.INT32_LE.get(buf, off),
      formatID: Token.INT32_LE.get(buf, off + 4),
      channelType: Token.INT32_LE.get(buf, off + 8),
      channelNum: Token.INT32_LE.get(buf, off + 12),
      samplingFrequency: Token.INT32_LE.get(buf, off + 16),
      bitsPerSample: Token.INT32_LE.get(buf, off + 20),
      sampleCount: Token.INT64_LE.get(buf, off + 24),
      blockSizePerChannel: Token.INT32_LE.get(buf, off + 32),
    };
  },
};
