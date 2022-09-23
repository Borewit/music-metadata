import { Latin1StringType } from "../token-types/string";

import { a2hex } from "./Util";

import type { IGetToken } from "../token-types";

const validFourCC = /^[\u0021-\u007E©][\0\u0020-\u007E]{3}/;

/**
 * Token for read FourCC
 * Ref: https://en.wikipedia.org/wiki/FourCC
 */
export const FourCcToken: IGetToken<string> = {
  len: 4,

  get: (buf: Uint8Array, off: number): string => {
    const id = new Latin1StringType(4).get(buf, off);

    if (!validFourCC.test(id)) {
      throw new Error(`FourCC contains invalid characters: ${a2hex(id)} "${id}"`);
    }

    return id;
  },

  // put: (buffer: Uint8Array, offset: number, id: string) => {
  //   const str = Buffer.from(id, "binary");
  //   if (str.length !== 4) throw new Error("Invalid length");
  //   return str.copy(buffer, offset);
  // },
};
