import * as Token from "../token-types";
import type { IGetToken } from "../strtok3";

/**
 * APE_HEADER: describes all of the necessary information about the APE file
 */
export interface IHeader {
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

/**
 * APE_HEADER: describes all of the necessary information about the APE file
 */
export const Header: IGetToken<IHeader> = {
  len: 24,

  get: (buf, off) => {
    return {
      // the compression level (see defines I.E. COMPRESSION_LEVEL_FAST)
      compressionLevel: Token.UINT16_LE.get(buf, off),
      // any format flags (for future use)
      formatFlags: Token.UINT16_LE.get(buf, off + 2),
      // the number of audio blocks in one frame
      blocksPerFrame: Token.UINT32_LE.get(buf, off + 4),
      // the number of audio blocks in the final frame
      finalFrameBlocks: Token.UINT32_LE.get(buf, off + 8),
      // the total number of frames
      totalFrames: Token.UINT32_LE.get(buf, off + 12),
      // the bits per sample (typically 16)
      bitsPerSample: Token.UINT16_LE.get(buf, off + 16),
      // the number of channels (1 or 2)
      channel: Token.UINT16_LE.get(buf, off + 18),
      // the sample rate (typically 44100)
      sampleRate: Token.UINT32_LE.get(buf, off + 20),
    };
  },
};
