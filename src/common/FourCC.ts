import * as Token from "token-types";

/**
 * Token for read FourCC
 * Ref: https://en.wikipedia.org/wiki/FourCC
 */
export const FourCcToken: Token.IGetToken<string> = {
  len: 4,

  get: (buf: Buffer, off: number): string => {
    const id = buf.toString("ascii", off, off +  FourCcToken.len);
    console.log("id=%s", id);
    for (const c of id) {
      if (!((c >= " " && c <= "Z") || ( c >= "a" && c <= "z")))
        throw new Error("FourCC contains invalid characters");
    }
    return id;
  }
};
