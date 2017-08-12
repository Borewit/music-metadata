import * as Token from "token-types";

export interface IChunkHeader {

  /**
   * 	A chunk ID (ie, 4 ASCII bytes)
   */
  chunkID: string,
  /**
   * Number of data bytes following this data header
   */
  size: number
}

/**
 * Common RIFF chunk header
 */
export const Header: Token.IGetToken<IChunkHeader> = {
  len: 8,

  get: (buf, off): IChunkHeader => {
    return {
      // Group-ID
      chunkID: new Token.StringType(4, 'ascii').get(buf, off),
      // Size
      size: buf.readUInt32BE(off + 4)
    };
  }
};
