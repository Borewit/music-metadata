import * as Token from 'token-types';
import type { IGetToken } from 'strtok3';
import type { IChunkHeader } from '../iff/index.js';

export type { IChunkHeader } from '../iff/index.js';

/**
 * Common RIFF chunk header
 */
export const Header: IGetToken<IChunkHeader> = {
  len: 8,

  get: (buf: Uint8Array, off): IChunkHeader => {
    return {
      // Group-ID
      chunkID: new Token.StringType(4, 'latin1').get(buf, off),
      // Size
      chunkSize: Token.UINT32_LE.get(buf, off + 4)
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

  public get(buf: Uint8Array, off: number): string {
    return new Token.StringType(this.tagHeader.chunkSize, 'ascii').get(buf, off);
  }
}
