import { stripNulls } from "../common/Util";
import { UINT32_LE, UINT16_LE, Uint8ArrayType } from "../token-types";
import { Latin1StringType } from "../token-types/string";

import type { IGetToken } from "../strtok3";

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
      description: stripNulls(new Latin1StringType(256).get(uint8array, off)).trim(),
      originator: stripNulls(new Latin1StringType(32).get(uint8array, off + 256)).trim(),
      originatorReference: stripNulls(new Latin1StringType(32).get(uint8array, off + 288)).trim(),
      originationDate: stripNulls(new Latin1StringType(10).get(uint8array, off + 320)).trim(),
      originationTime: stripNulls(new Latin1StringType(8).get(uint8array, off + 330)).trim(),
      timeReferenceLow: UINT32_LE.get(uint8array, off + 338),
      timeReferenceHigh: UINT32_LE.get(uint8array, off + 342),
      version: UINT16_LE.get(uint8array, off + 346),
      umid: new Uint8ArrayType(64).get(uint8array, off + 348),
      loudnessValue: UINT16_LE.get(uint8array, off + 412),
      maxTruePeakLevel: UINT16_LE.get(uint8array, off + 414),
      maxMomentaryLoudness: UINT16_LE.get(uint8array, off + 416),
      maxShortTermLoudness: UINT16_LE.get(uint8array, off + 418),
    };
  },
};
