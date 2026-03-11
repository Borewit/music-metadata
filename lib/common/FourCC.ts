import type { IToken } from 'strtok3';
import { latin1toString, latin1fromString } from '@exodus/bytes/single-byte.js';

import * as util from './Util.js';
import { InternalParserError, FieldDecodingError } from '../ParseError.js';

const validFourCC = /^[\x21-\x7e©][\x20-\x7e\x00()]{3}/;

/**
 * Token for read FourCC
 * Ref: https://en.wikipedia.org/wiki/FourCC
 */
export const FourCcToken: IToken<string> = {
  len: 4,

  get: (buf: Uint8Array, off: number): string => {
    const id =  latin1toString(buf.subarray(off, off + FourCcToken.len));
    if (!id.match(validFourCC)) {
      throw new FieldDecodingError(`FourCC contains invalid characters: ${util.a2hex(id)} "${id}"`);
    }
    return id;
  },

  put: (buffer: Uint8Array, offset: number, id: string) => {
    const str = latin1fromString(id);
    if (str.length !== 4)
      throw new InternalParserError('Invalid length');
    buffer.set(str, offset);
    return offset + 4;
  }
};
