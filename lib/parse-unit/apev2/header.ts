import { sequenceToObject } from "../combinate/sequence-to-object";
import { u16le, u32le } from "../primitive/integer";

import type { Unit } from "../type/unit";

/**
 * APE_HEADER: describes all of the necessary information about the APE file
 */
export interface ApeHeader {
  // the compression level (see defines I.E. COMPRESSION_LEVEL_FAST)
  compressionLevel: number;
  // any format flags (for future use)
  formatFlags: number;
  // the number of audio blocks in one frame
  blocksPerFrame: number;
  // the number of audio blocks in the final frame
  finalFrameBlocks: number;
  // the total number of frames
  totalFrames: number;
  // the bits per sample (typically 16)
  bitsPerSample: number;
  // the number of channels (1 or 2)
  channel: number;
  // the sample rate (typically 44100)
  sampleRate: number;
}

export const header: Unit<ApeHeader, RangeError> = sequenceToObject(
  {
    compressionLevel: 0,
    formatFlags: 1,
    blocksPerFrame: 2,
    finalFrameBlocks: 3,
    totalFrames: 4,
    bitsPerSample: 5,
    channel: 6,
    sampleRate: 7,
  },
  u16le,
  u16le,
  u32le,
  u32le,
  u32le,
  u16le,
  u16le,
  u32le
);
