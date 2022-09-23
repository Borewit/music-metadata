import { Latin1StringType } from "../token-types/string";

import type { IGetToken } from "../token-types";


export interface IAtomFtyp {
  type: string;
}

export const ftyp: IGetToken<IAtomFtyp> = {
  len: 4,

  get: (buf: Uint8Array, off: number): IAtomFtyp => {
    return {
      type: new Latin1StringType(4).get(buf, off),
    };
  },
};

export const tkhd: IGetToken<IAtomFtyp> = {
  len: 4,

  get: (buf: Uint8Array, off: number): IAtomFtyp => {
    return {
      type: new Latin1StringType(4).get(buf, off),
    };
  },
};
