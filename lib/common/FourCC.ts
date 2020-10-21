import Util from './Util';
import { IToken } from "strtok3/lib/core";

const validFourCC =  /^[\x21-\x7e©][\x20-\x7e\x00()3]/;

/**
 * Token for read FourCC
 * Ref: https://en.wikipedia.org/wiki/FourCC
 */
export const FourCcToken: IToken<string> = {
  len: 4,

  get: (buf: Buffer, off: number): string => {
    const id = buf.toString("binary", off, off + FourCcToken.len);
    if (!id.match(validFourCC)) {
      throw new Error(`FourCC contains invalid characters: ${Util.a2hex(id)}`);
    }
    return id;
  },

  put: (buffer: Buffer, offset: number, id: string) => {
    const str = Buffer.from(id, 'binary');
    if (str.length !== 4)
      throw new Error("Invalid length");
    return str.copy(buffer, offset);
  }
};
