import { INT32_BE } from "../token-types";

import type { IGetToken } from "../token-types";

/**
 * Sample-to-Chunk ('stsc') atom table entry interface
 */
export interface ISampleToChunk {
  firstChunk: number;
  samplesPerChunk: number;
  sampleDescriptionId: number;
}

export const SampleToChunkToken: IGetToken<ISampleToChunk> = {
  len: 12,

  get(buf: Uint8Array, off: number): ISampleToChunk {
    return {
      firstChunk: INT32_BE.get(buf, off),
      samplesPerChunk: INT32_BE.get(buf, off + 4),
      sampleDescriptionId: INT32_BE.get(buf, off + 8),
    };
  },
};
