import * as Token from "../token-types";
import type { IGetToken } from "../strtok3";

import { FourCcToken } from "../common/FourCC";

/**
 * Common interface for the common chunk DSD header
 */
export interface IChunkHeader {
  /**
   * Chunk ID
   */
  id: string;

  /**
   * Chunk size
   */
  size: bigint;
}

/**
 * Common chunk DSD header: the 'chunk name (Four-CC)' & chunk size
 */
export const ChunkHeader: IGetToken<IChunkHeader> = {
  len: 12,

  get: (buf: Uint8Array, off: number): IChunkHeader => {
    return {
      id: FourCcToken.get(buf, off),
      size: Token.UINT64_LE.get(buf, off + 4),
    };
  },
};
