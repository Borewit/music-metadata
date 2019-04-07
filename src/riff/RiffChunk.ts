import * as Token from 'token-types';
import {FourCcToken} from '../common/FourCC';
import {IChunkHeader} from '../iff';

export {IChunkHeader} from '../iff';

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
      chunkSize: buf.readUInt32LE(off + 4)
    };
  }
};

/**
 * Token to parse RIFF-INFO tag value
 */
export class ListInfoTagValue implements Token.IGetToken<string> {

  public len: number;

  public constructor(private tagHeader: IChunkHeader) {
    this.len = tagHeader.chunkSize;
    this.len += this.len & 1; // if it is an odd length, round up to even
  }

  public get(buf, off): string {
    return new Token.StringType(this.tagHeader.chunkSize, 'ascii').get(buf, off);
  }
}
