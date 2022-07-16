import { IGetToken } from "../strtok3";
import * as Token from "../token-types";
import { Latin1StringType } from "../token-types/string";

export interface IBroadcastAudioExtensionChunk {
  description: string;
  originator: string;
  originatorReference: string;
  originationDate: string;
  originationTime: string;
  timeReferenceLow: number;
  timeReferenceHigh: number;
  version: number;
  umid: Uint8Array;
}

/**
 * Broadcast Audio Extension Chunk
 * Ref: https://tech.ebu.ch/docs/tech/tech3285.pdf
 */
export const BroadcastAudioExtensionChunk: IGetToken<IBroadcastAudioExtensionChunk> = {
  len: 420,

  get: (uint8array, off) => {
    return {
      description: new Latin1StringType(256).get(uint8array, off).trim(),
      originator: new Latin1StringType(32).get(uint8array, off + 256).trim(),
      originatorReference: new Latin1StringType(32).get(uint8array, off + 288).trim(),
      originationDate: new Latin1StringType(10).get(uint8array, off + 320).trim(),
      originationTime: new Latin1StringType(8).get(uint8array, off + 330).trim(),
      timeReferenceLow: Token.UINT32_LE.get(uint8array, off + 338),
      timeReferenceHigh: Token.UINT32_LE.get(uint8array, off + 342),
      version: Token.UINT16_LE.get(uint8array, off + 346),
      umid: new Token.Uint8ArrayType(64).get(uint8array, off + 348),
      loudnessValue: Token.UINT16_LE.get(uint8array, off + 412),
      maxTruePeakLevel: Token.UINT16_LE.get(uint8array, off + 414),
      maxMomentaryLoudness: Token.UINT16_LE.get(uint8array, off + 416),
      maxShortTermLoudness: Token.UINT16_LE.get(uint8array, off + 418),
    };
  },
};
