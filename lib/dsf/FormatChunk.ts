import { INT32_LE, INT64_LE } from "../token-types";

import type { IGetToken } from "../token-types";


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
      formatVersion: INT32_LE.get(buf, off),
      formatID: INT32_LE.get(buf, off + 4),
      channelType: INT32_LE.get(buf, off + 8),
      channelNum: INT32_LE.get(buf, off + 12),
      samplingFrequency: INT32_LE.get(buf, off + 16),
      bitsPerSample: INT32_LE.get(buf, off + 20),
      sampleCount: INT64_LE.get(buf, off + 24),
      blockSizePerChannel: INT32_LE.get(buf, off + 32),
    };
  },
};
