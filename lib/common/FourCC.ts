import * as util from "./Util";
import { IToken } from "../strtok3";

const validFourCC = /^[\u0021-\u007E©][\0\u0020-\u007E]{3}/;

/**
 * Token for read FourCC
 * Ref: https://en.wikipedia.org/wiki/FourCC
 */
export const FourCcToken: IToken<string> = {
  len: 4,

  get: (buf: Buffer, off: number): string => {
    const id = buf.toString("binary", off, off + FourCcToken.len);
    switch (id) {
      default:
        if (!validFourCC.test(id)) {
          throw new Error(`FourCC contains invalid characters: ${util.a2hex(id)} "${id}"`);
        }
    }
    return id;
  },

  put: (buffer: Buffer, offset: number, id: string) => {
    const str = Buffer.from(id, "binary");
    if (str.length !== 4) throw new Error("Invalid length");
    return str.copy(buffer, offset);
  },
};
