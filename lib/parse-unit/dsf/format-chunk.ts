import { sequenceToObject } from "../combinate/sequence-to-object";
import { u32le, u64le } from "../primitive/integer";
import { skip } from "../primitive/skip";

import type { Unit } from "../type/unit";

export type ChannelType =
  | 1 // mono
  | 2 // stereo
  | 3 // 3 channels
  | 4 // quad
  | 5 // 4 channels
  | 6 // 5 channels
  | 7; // 5.1 channels

/**
 * Interface to format chunk payload chunk
 */
export interface FormatChunk {
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

export const formatChunk: Unit<FormatChunk, RangeError> = sequenceToObject(
  {
    formatVersion: 0,
    formatID: 1,
    channelType: 2,
    channelNum: 3,
    samplingFrequency: 4,
    bitsPerSample: 5,
    sampleCount: 6,
    blockSizePerChannel: 7,
  },
  u32le,
  u32le,
  u32le as Unit<ChannelType, RangeError>,
  u32le,
  u32le,
  u32le,
  u64le,
  u32le,
  skip(4)
);
