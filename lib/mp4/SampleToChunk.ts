import * as Token from "../token-types";
import { IGetToken } from "../strtok3";

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
      firstChunk: Token.INT32_BE.get(buf, off),
      samplesPerChunk: Token.INT32_BE.get(buf, off + 4),
      sampleDescriptionId: Token.INT32_BE.get(buf, off + 8),
    };
  },
};
