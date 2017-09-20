import * as Token from "token-types";

/**
 * Token for read FourCC
 * Ref: https://en.wikipedia.org/wiki/FourCC
 */
export const FourCcToken: Token.IGetToken<string> = {
  len: 4,

  get: (buf: Buffer, off: number): string => {
    const id = buf.toString("binary", off, off + FourCcToken.len);
    for (const c of id) {
      if (!((c >= " " && c <= "z") || c === '©')) {
        console.log('ID=%s', id);
        throw new Error("FourCC contains invalid characters");
      }
    }
    return id;
  }
};
