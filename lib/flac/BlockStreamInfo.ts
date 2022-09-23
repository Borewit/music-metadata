import { getBitAllignedNumber } from "../common/Util";
import { UINT16_BE, UINT24_BE, Uint8ArrayType } from "../token-types";

import type { IGetToken } from "../token-types";

/**
 * METADATA_BLOCK_DATA
 * Ref: https://xiph.org/flac/format.html#metadata_block_streaminfo
 */
export interface IBlockStreamInfo {
  minimumBlockSize: number;
  // The maximum block size (in samples) used in the stream.
  // (Minimum blocksize == maximum blocksize) implies a fixed-blocksize stream.
  maximumBlockSize: number;
  // The minimum frame size (in bytes) used in the stream.
  // May be 0 to imply the value is not known.
  minimumFrameSize: number;
  // The maximum frame size (in bytes) used in the stream.
  // May be 0 to imply the value is not known.
  maximumFrameSize: number;
  // Sample rate in Hz. Though 20 bits are available,
  // the maximum sample rate is limited by the structure of frame headers to 655350Hz.
  // Also, a value of 0 is invalid.
  sampleRate: number;
  // probably slower: sampleRate: common.getBitAllignedNumber(buf, off + 10, 0, 20),
  // (number of channels)-1. FLAC supports from 1 to 8 channels
  channels: number;
  // bits per sample)-1.
  // FLAC supports from 4 to 32 bits per sample. Currently the reference encoder and decoders only support up to 24 bits per sample.
  bitsPerSample: number;
  // Total samples in stream.
  // 'Samples' means inter-channel sample, i.e. one second of 44.1Khz audio will have 44100 samples regardless of the number of channels.
  // A value of zero here means the number of total samples is unknown.
  totalSamples: number;
  // the MD5 hash of the file (see notes for usage... it's a littly tricky)
  fileMD5: Uint8Array;
}

/**
 * METADATA_BLOCK_DATA
 * Ref: https://xiph.org/flac/format.html#metadata_block_streaminfo
 */
export const BlockStreamInfo: IGetToken<IBlockStreamInfo> = {
  len: 34,

  get: (buf: Uint8Array, off: number): IBlockStreamInfo => {
    return {
      // The minimum block size (in samples) used in the stream.
      minimumBlockSize: UINT16_BE.get(buf, off),
      // The maximum block size (in samples) used in the stream.
      // (Minimum blocksize == maximum blocksize) implies a fixed-blocksize stream.
      maximumBlockSize: UINT16_BE.get(buf, off + 2) / 1000,
      // The minimum frame size (in bytes) used in the stream.
      // May be 0 to imply the value is not known.
      minimumFrameSize: UINT24_BE.get(buf, off + 4),
      // The maximum frame size (in bytes) used in the stream.
      // May be 0 to imply the value is not known.
      maximumFrameSize: UINT24_BE.get(buf, off + 7),
      // Sample rate in Hz. Though 20 bits are available,
      // the maximum sample rate is limited by the structure of frame headers to 655350Hz.
      // Also, a value of 0 is invalid.
      sampleRate: UINT24_BE.get(buf, off + 10) >> 4,
      // probably slower: sampleRate: common.getBitAllignedNumber(buf, off + 10, 0, 20),
      // (number of channels)-1. FLAC supports from 1 to 8 channels
      channels: getBitAllignedNumber(buf, off + 12, 4, 3) + 1,
      // bits per sample)-1.
      // FLAC supports from 4 to 32 bits per sample. Currently the reference encoder and decoders only support up to 24 bits per sample.
      bitsPerSample: getBitAllignedNumber(buf, off + 12, 7, 5) + 1,
      // Total samples in stream.
      // 'Samples' means inter-channel sample, i.e. one second of 44.1Khz audio will have 44100 samples regardless of the number of channels.
      // A value of zero here means the number of total samples is unknown.
      totalSamples: getBitAllignedNumber(buf, off + 13, 4, 36),
      // the MD5 hash of the file (see notes for usage... it's a littly tricky)
      fileMD5: new Uint8ArrayType(16).get(buf, off + 18),
    };
  },
};
