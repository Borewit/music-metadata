import { getBitAllignedNumber, isBitSet } from "../../common/Util";
import { UINT32_LE, UINT16_LE } from "../../token-types";
import { Latin1StringType } from "../../token-types/string";

import type { IGetToken } from "../../token-types";

/**
 * MusePack stream version 7 format specification
 * http://trac.musepack.net/musepack/wiki/SV7Specification
 */

export interface IHeader {
  // word 0
  signature: string;
  streamMinorVersion: number;
  streamMajorVersion: number;
  // word 1
  frameCount: number;
  // word 2
  intensityStereo: boolean;
  midSideStereo: boolean;
  maxBand: number;
  profile: number;
  link: number;
  sampleFrequency: number;
  maxLevel: number;
  // word 3
  titleGain: number;
  titlePeak: number;
  // word 4
  albumGain: number;
  albumPeak: number;
  // word 5
  trueGapless: boolean;
  lastFrameLength: number;
}

/**
 * BASIC STRUCTURE
 */
export const Header: IGetToken<IHeader> = {
  len: 6 * 4,

  get: (buf, off) => {
    const header = {
      // word 0
      signature: new Latin1StringType(3).get(buf, off),
      // versionIndex number * 1000 (3.81 = 3810) (remember that 4-byte alignment causes this to take 4-bytes)
      streamMinorVersion: getBitAllignedNumber(buf, off + 3, 0, 4),
      streamMajorVersion: getBitAllignedNumber(buf, off + 3, 4, 4),
      // word 1
      frameCount: UINT32_LE.get(buf, off + 4),
      // word 2
      maxLevel: UINT16_LE.get(buf, off + 8),
      sampleFrequency: [44_100, 48_000, 37_800, 32_000][getBitAllignedNumber(buf, off + 10, 0, 2)],
      link: getBitAllignedNumber(buf, off + 10, 2, 2),
      profile: getBitAllignedNumber(buf, off + 10, 4, 4),
      maxBand: getBitAllignedNumber(buf, off + 11, 0, 6),
      intensityStereo: isBitSet(buf, off + 11, 6),
      midSideStereo: isBitSet(buf, off + 11, 7),
      // word 3
      titlePeak: UINT16_LE.get(buf, off + 12),
      titleGain: UINT16_LE.get(buf, off + 14),
      // word 4
      albumPeak: UINT16_LE.get(buf, off + 16),
      albumGain: UINT16_LE.get(buf, off + 18),
      // word
      lastFrameLength: (UINT32_LE.get(buf, off + 20) >>> 20) & 0x7_ff,
      trueGapless: isBitSet(buf, off + 23, 0),
    };

    header.lastFrameLength = header.trueGapless ? (UINT32_LE.get(buf, 20) >>> 20) & 0x7_ff : 0;

    return header;
  },
};
