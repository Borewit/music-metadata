import * as Token from 'token-types';
import type { IGetToken } from 'strtok3';

import * as util from '../../common/Util.js';

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
      signature: new TextDecoder('latin1').decode(buf.subarray(off, off + 3)),
      // versionIndex number * 1000 (3.81 = 3810) (remember that 4-byte alignment causes this to take 4-bytes)
      streamMinorVersion:  util.getBitAllignedNumber(buf, off + 3, 0, 4),
      streamMajorVersion: util.getBitAllignedNumber(buf, off + 3, 4, 4),
      // word 1
      frameCount: Token.UINT32_LE.get(buf, off + 4),
      // word 2
      maxLevel:  Token.UINT16_LE.get(buf, off + 8),
      sampleFrequency:  [44100, 48000, 37800, 32000][util.getBitAllignedNumber(buf, off + 10, 0, 2)],
      link:  util.getBitAllignedNumber(buf, off + 10, 2, 2),
      profile:  util.getBitAllignedNumber(buf, off + 10, 4, 4),
      maxBand: util.getBitAllignedNumber(buf, off + 11, 0, 6),
      intensityStereo: util.isBitSet(buf, off + 11, 6),
      midSideStereo: util.isBitSet(buf, off + 11, 7),
      // word 3
      titlePeak: Token.UINT16_LE.get(buf, off + 12),
      titleGain: Token.UINT16_LE.get(buf, off + 14),
      // word 4
      albumPeak: Token.UINT16_LE.get(buf, off + 16),
      albumGain: Token.UINT16_LE.get(buf, off + 18),
      // word
      lastFrameLength: (Token.UINT32_LE.get(buf, off + 20) >>> 20) & 0x7FF,
      trueGapless: util.isBitSet(buf, off + 23, 0)
    };

    header.lastFrameLength = header.trueGapless ? (Token.UINT32_LE.get(buf, 20) >>> 20) & 0x7FF : 0;

    return header;
  }
};
