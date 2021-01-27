import * as Token from 'token-types';
import {IChunkHeader} from '../iff';
import { IGetToken } from 'strtok3/lib/core';
export {IChunkHeader} from '../iff';

/**
 * Common RIFF chunk header
 */
export const Header: IGetToken<IChunkHeader> = {
  len: 8,

  get: (buf, off): IChunkHeader => {
    return {
      // Group-ID
      chunkID: buf.toString('binary', off, off + 4),
      // Size
      chunkSize: buf.readUInt32LE(off + 4)
    };
  }
};

/**
 * Token to parse RIFF-INFO tag value
 */
export class ListInfoTagValue implements IGetToken<string> {

  public len: number;

  public constructor(private tagHeader: IChunkHeader) {
    this.len = tagHeader.chunkSize;
    this.len += this.len & 1; // if it is an odd length, round up to even
  }

  public get(buf, off): string {
    return new Token.StringType(this.tagHeader.chunkSize, 'ascii').get(buf, off);
  }
}
