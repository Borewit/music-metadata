import { FourCcToken } from "../common/FourCC";
import { UINT32_BE } from "../token-types";

import type { IGetToken } from "../strtok3";

/**
 * "EA IFF 85" Standard for Interchange Format Files
 * Ref: http://www.martinreddy.net/gfx/2d/IFF.txt
 */
export interface IChunkHeader {
  /**
   * A chunk ID (ie, 4 ASCII bytes)
   */
  chunkID: string;
  /**
   * Number of data bytes following this data header
   */
  chunkSize: number;
}

/**
 * "EA IFF 85" Standard for Interchange Format Files
 * Ref: http://www.martinreddy.net/gfx/2d/IFF.txt
 */
export interface IChunkHeader64 {
  /**
   * A chunk ID (ie, 4 ASCII bytes)
   */
  chunkID: string;
  /**
   * Number of data bytes following this data header
   */
  chunkSize: bigint;
}

/**
 * Common AIFF chunk header
 */
export const Header: IGetToken<IChunkHeader> = {
  len: 8,

  get: (buf, off): IChunkHeader => {
    return {
      // Chunk type ID
      chunkID: FourCcToken.get(buf, off),
      // Chunk size
      chunkSize: Number(BigInt(UINT32_BE.get(buf, off + 4))),
    };
  },
};
