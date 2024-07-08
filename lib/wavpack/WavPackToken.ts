import * as Token from 'token-types';

import { FourCcToken } from '../common/FourCC.js';

import type { IGetToken } from 'strtok3';

/**
 * WavPack Block Header
 *
 * 32-byte little-endian header at the front of every WavPack block
 *
 * Ref:
 * - http://www.wavpack.com/WavPack5FileFormat.pdf (page 2/6: 2.0 "Block Header")
 */
export interface IBlockHeader {
  // should be equal to 'wvpk' for WavPack
  BlockID: string,
  // size of entire block (minus 8)
  blockSize: number,
  //  0x402 to 0x410 are valid for decode
  version: number,
  // 40-bit block_index
  blockIndex: number,
  //  40-bit total samples for entire file (if block_index == 0 and a value of -1 indicates an unknown length)
  totalSamples: number,
  //  number of samples in this block, 0 = non-audio block
  blockSamples: number,
  // various flags for id and decoding
  flags: {
    // 00 = 1 byte / sample (1-8 bits / sample)
    // 01 = 2 bytes / sample (9-16 bits / sample)
    // 10 = 3 bytes / sample (15-24 bits / sample)
    // 11 = 4 bytes / sample (25-32 bits / sample)
    bitsPerSample: number,
    isMono: boolean,
    isHybrid: boolean
    isJointStereo: boolean,
    crossChannel: boolean,
    hybridNoiseShaping: boolean,
    floatingPoint: boolean,
    samplingRate: number,
    isDSD: boolean

    // false = PCM audio; true = DSD audio (ver 5.0+)
  }
  // crc for actual decoded data
  crc: Uint8Array
}

export interface IMetadataId {
  /**
   * metadata function id
   */
  functionId: number,
  /**
   * If true, audio-decoder does not need to understand the metadata field
   */
  isOptional: boolean
  /**
   * actual data byte length is 1 less
   */
  isOddSize: boolean
  /**
   * large block (> 255 words)
   */
  largeBlock: boolean
}

const SampleRates = [6000, 8000, 9600, 11025, 12000, 16000, 22050, 24000, 32000, 44100,
  48000, 64000, 88200, 96000, 192000, -1];

export class WavPack {

  /**
   * WavPack Block Header
   *
   * 32-byte little-endian header at the front of every WavPack block
   *
   * Ref: http://www.wavpack.com/WavPack5FileFormat.pdf (page 2/6: 2.0 "Block Header")
   */
  public static BlockHeaderToken: IGetToken<IBlockHeader> = {
    len: 32,

    get: (buf, off) => {

      const flags = Token.UINT32_LE.get(buf, off + 24);

      const res = {
        // should equal 'wvpk'
        BlockID: FourCcToken.get(buf, off),
        //  0x402 to 0x410 are valid for decode
        blockSize: Token.UINT32_LE.get(buf, off + 4),
        //  0x402 (1026) to 0x410 are valid for decode
        version: Token.UINT16_LE.get(buf, off + 8),
        //  40-bit total samples for entire file (if block_index == 0 and a value of -1 indicates an unknown length)
        totalSamples: /* replace with bigint? (Token.UINT8.get(buf, off + 11) << 32) + */ Token.UINT32_LE.get(buf, off + 12),
        // 40-bit block_index
        blockIndex: /* replace with bigint? (Token.UINT8.get(buf, off + 10) << 32) + */ Token.UINT32_LE.get(buf, off + 16),
        // 40-bit total samples for entire file (if block_index == 0 and a value of -1 indicates an unknown length)
        blockSamples: Token.UINT32_LE.get(buf, off + 20),
        // various flags for id and decoding
        flags: {
          bitsPerSample: (1 + WavPack.getBitAllignedNumber(flags, 0, 2)) * 8,
          isMono: WavPack.isBitSet(flags, 2),
          isHybrid: WavPack.isBitSet(flags, 3),
          isJointStereo: WavPack.isBitSet(flags, 4),
          crossChannel: WavPack.isBitSet(flags, 5),
          hybridNoiseShaping: WavPack.isBitSet(flags, 6),
          floatingPoint: WavPack.isBitSet(flags, 7),
          samplingRate: SampleRates[WavPack.getBitAllignedNumber(flags, 23, 4)],
          isDSD: WavPack.isBitSet(flags, 31)
        },
        // crc for actual decoded data
        crc: new Token.Uint8ArrayType(4).get(buf, off + 28)
      };

      if (res.flags.isDSD) {
        res.totalSamples *= 8;
      }

      return res;
    }
  };

  /**
   * 3.0 Metadata Sub-Blocks
   * Ref: http://www.wavpack.com/WavPack5FileFormat.pdf (page 4/6: 3.0 "Metadata Sub-Block")
   */
  public static MetadataIdToken: IGetToken<IMetadataId> = {
    len: 1,

    get: (buf, off) => {

      return {
        functionId: WavPack.getBitAllignedNumber(buf[off], 0, 6), // functionId overlaps with isOptional flag
        isOptional: WavPack.isBitSet(buf[off], 5),
        isOddSize: WavPack.isBitSet(buf[off], 6),
        largeBlock: WavPack.isBitSet(buf[off], 7)
      };
    }
  };

  private static isBitSet(flags: number, bitOffset: number): boolean {
    return WavPack.getBitAllignedNumber(flags, bitOffset, 1) === 1;
  }

  private static getBitAllignedNumber(flags: number, bitOffset: number, len: number): number {
    return (flags >>> bitOffset) & (0xffffffff >>> (32 - len));
  }
}
