import * as Token from "../token-types";
import { IGetToken } from "../strtok3";

export interface IAtomFtyp {
  type: string;
}

export const ftyp: IGetToken<IAtomFtyp> = {
  len: 4,

  get: (buf: Buffer, off: number): IAtomFtyp => {
    return {
      type: new Token.StringType(4, "ascii").get(buf, off),
    };
  },
};

export const tkhd: IGetToken<IAtomFtyp> = {
  len: 4,

  get: (buf: Buffer, off: number): IAtomFtyp => {
    return {
      type: new Token.StringType(4, "ascii").get(buf, off),
    };
  },
};
