import type { IGetToken } from 'strtok3';
import * as Token from 'token-types';
import { stripNulls } from '../common/Util.js';

export interface IBroadcastAudioExtensionChunk {
  description: string;
  originator: string;
  originatorReference: string;
  originationDate: string;
  originationTime: string;
  timeReferenceLow: number,
  timeReferenceHigh: number,
  version: number,
  umid: Uint8Array,
}

/**
 * Broadcast Audio Extension Chunk
 * Ref: https://tech.ebu.ch/docs/tech/tech3285.pdf
 */
export const BroadcastAudioExtensionChunk: IGetToken<IBroadcastAudioExtensionChunk> = {
  len: 420,

  get: (uint8array, off) => {
    return {
      description: stripNulls(new Token.StringType(256, 'ascii').get(uint8array, off)).trim(),
      originator: stripNulls(new Token.StringType(32, 'ascii').get(uint8array, off + 256)).trim(),
      originatorReference: stripNulls(new Token.StringType(32, 'ascii').get(uint8array, off + 288)).trim(),
      originationDate: stripNulls(new Token.StringType(10, 'ascii').get(uint8array, off + 320)).trim(),
      originationTime: stripNulls(new Token.StringType(8, 'ascii').get(uint8array, off + 330)).trim(),
      timeReferenceLow: Token.UINT32_LE.get(uint8array, off + 338),
      timeReferenceHigh: Token.UINT32_LE.get(uint8array, off + 342),
      version: Token.UINT16_LE.get(uint8array, off + 346),
      umid: new Token.Uint8ArrayType(64).get(uint8array, off + 348),
      loudnessValue: Token.UINT16_LE.get(uint8array, off + 412),
      maxTruePeakLevel: Token.UINT16_LE.get(uint8array, off + 414),
      maxMomentaryLoudness: Token.UINT16_LE.get(uint8array, off + 416),
      maxShortTermLoudness: Token.UINT16_LE.get(uint8array, off + 418)
    };
  }
};
