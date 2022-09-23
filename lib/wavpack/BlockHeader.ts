import { FourCcToken } from "../common/FourCC";
import { UINT32_LE, UINT16_LE, Uint8ArrayType } from "../token-types";

import { getBitAllignedNumber, isBitSet } from "./util";

import type { IGetToken } from "../token-types";

/**
 * WavPack Block Header
 *
 * 32-byte little-endian header at the front of every WavPack block
 *
 * Ref:
 * - http://www.wavpack.com/WavPack5FileFormat.pdf (page 2/6: 2.0 "Block Header")
 */
export interface BlockHeader {
  // should be equal to 'wvpk' for WavPack
  BlockID: string;
  // size of entire block (minus 8)
  blockSize: number;
  //  0x402 to 0x410 are valid for decode
  version: number;
  // 40-bit block_index
  blockIndex: number;
  //  40-bit total samples for entire file (if block_index == 0 and a value of -1 indicates an unknown length)
  totalSamples: number;
  //  number of samples in this block, 0 = non-audio block
  blockSamples: number;
  // various flags for id and decoding
  flags: {
    // 00 = 1 byte / sample (1-8 bits / sample)
    // 01 = 2 bytes / sample (9-16 bits / sample)
    // 10 = 3 bytes / sample (15-24 bits / sample)
    // 11 = 4 bytes / sample (25-32 bits / sample)
    bitsPerSample: number;
    isMono: boolean;
    isHybrid: boolean;
    isJointStereo: boolean;
    crossChannel: boolean;
    hybridNoiseShaping: boolean;
    floatingPoint: boolean;
    samplingRate: number;
    isDSD: boolean;

    // false = PCM audio; true = DSD audio (ver 5.0+)
  };
  // crc for actual decoded data
  crc: Uint8Array;
}

const SampleRates = [
  6000, 8000, 9600, 11_025, 12_000, 16_000, 22_050, 24_000, 32_000, 44_100, 48_000, 64_000, 88_200, 96_000, 192_000, -1,
];

/**
 * WavPack Block Header
 *
 * 32-byte little-endian header at the front of every WavPack block
 *
 * Ref: http://www.wavpack.com/WavPack5FileFormat.pdf (page 2/6: 2.0 "Block Header")
 */
export const BlockHeaderToken: IGetToken<BlockHeader> = {
  len: 32,

  get: (buf, off) => {
    const flags = UINT32_LE.get(buf, off + 24);

    const res = {
      // should equal 'wvpk'
      BlockID: FourCcToken.get(buf, off),
      //  0x402 to 0x410 are valid for decode
      blockSize: UINT32_LE.get(buf, off + 4),
      //  0x402 (1026) to 0x410 are valid for decode
      version: UINT16_LE.get(buf, off + 8),
      //  40-bit total samples for entire file (if block_index == 0 and a value of -1 indicates an unknown length)
      totalSamples: /* replace with bigint? (Token.UINT8.get(buf, off + 11) << 32) + */ UINT32_LE.get(buf, off + 12),
      // 40-bit block_index
      blockIndex: /* replace with bigint? (Token.UINT8.get(buf, off + 10) << 32) + */ UINT32_LE.get(buf, off + 16),
      // 40-bit total samples for entire file (if block_index == 0 and a value of -1 indicates an unknown length)
      blockSamples: UINT32_LE.get(buf, off + 20),
      // various flags for id and decoding
      flags: {
        bitsPerSample: (1 + getBitAllignedNumber(flags, 0, 2)) * 8,
        isMono: isBitSet(flags, 2),
        isHybrid: isBitSet(flags, 3),
        isJointStereo: isBitSet(flags, 4),
        crossChannel: isBitSet(flags, 5),
        hybridNoiseShaping: isBitSet(flags, 6),
        floatingPoint: isBitSet(flags, 7),
        samplingRate: SampleRates[getBitAllignedNumber(flags, 23, 4)],
        isDSD: isBitSet(flags, 31),
      },
      // crc for actual decoded data
      crc: new Uint8ArrayType(4).get(buf, off + 28),
    };

    if (res.flags.isDSD) {
      res.totalSamples *= 8;
    }

    return res;
  },
};
