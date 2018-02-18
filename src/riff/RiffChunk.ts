import * as Token from "token-types";
import {FourCcToken} from "../common/FourCC";

export interface IChunkHeader {

  /**
   *  A chunk ID (ie, 4 ASCII bytes)
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
      chunkID: FourCcToken.get(buf, off),
      // Size
      size: buf.readUInt32BE(off + 4)
    };
  }
};

/**
 * Token to parse RIFF-INFO tag value
 */
export class ListInfoTagValue implements Token.IGetToken<string> {

  public len: number;

  public constructor(private tagHeader: IChunkHeader) {
    this.len = tagHeader.size;
    this.len += this.len & 1; // if it is an odd length, round up to even
  }

  public get(buf, off): string {
    return new Token.StringType(this.tagHeader.size, 'ascii').get(buf, off);
  }
}
