import * as Token from "../token-types";
import { IGetToken } from "../strtok3";

export interface IAtomHeader {
  length: bigint;
  name: string;
}

export const Header: IGetToken<IAtomHeader> = {
  len: 8,

  get: (buf: Uint8Array, off: number): IAtomHeader => {
    const length = Token.UINT32_BE.get(buf, off);
    if (length < 0) throw new Error("Invalid atom header length");

    return {
      length: BigInt(length),
      name: new Token.StringType(4, "binary").get(buf, off + 4),
    };
  },

  // put: (buf: Uint8Array, off: number, hdr: IAtomHeader) => {
  //   Token.UINT32_BE.put(buf, off, Number(hdr.length));
  //   return FourCcToken.put(buf, off + 4, hdr.name);
  // },
};
