import type { IGetToken } from 'strtok3';
import * as Token from 'token-types';
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
