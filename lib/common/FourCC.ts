import { IToken } from 'strtok3';
import { stringToUint8Array, uint8ArrayToString } from 'uint8array-extras';

import * as util from './Util.js';

const validFourCC = /^[\x21-\x7e©][\x20-\x7e\x00()]{3}/;

/**
 * Token for read FourCC
 * Ref: https://en.wikipedia.org/wiki/FourCC
 */
export const FourCcToken: IToken<string> = {
  len: 4,

  get: (buf: Uint8Array, off: number): string => {
    const id = uint8ArrayToString(buf.slice(off, off + FourCcToken.len), 'latin1');
    if (!id.match(validFourCC)) {
      throw new Error(`FourCC contains invalid characters: ${util.a2hex(id)} "${id}"`);
    }
    return id;
  },

  put: (buffer: Uint8Array, offset: number, id: string) => {
    const str = stringToUint8Array(id);
    if (str.length !== 4)
      throw new Error('Invalid length');
    buffer.set(str, offset);
    return offset + 4;
  }
};
