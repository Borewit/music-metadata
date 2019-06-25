import * as Token from "token-types";
import {FourCcToken} from "../common/FourCC";

/**
 * "EA IFF 85" Standard for Interchange Format Files
 * Ref: http://www.martinreddy.net/gfx/2d/IFF.txt
 */
export interface IChunkHeader {

  /**
   * 	A chunk ID (ie, 4 ASCII bytes)
   */
  chunkID: string,
  /**
   * Number of data bytes following this data header
   */
  chunkSize: number
}

/**
 * Common AIFF chunk header
 */
export const Header: Token.IGetToken<IChunkHeader> = {
  len: 8,

  get: (buf, off): IChunkHeader => {
    return {
      // Chunk type ID
      chunkID: FourCcToken.get(buf, off),
      // Chunk size
      chunkSize: buf.readUInt32BE(off + 4)
    };
  }
};
