import { UINT8, UINT24_BE, UINT32_BE } from "../token-types";

import type { IGetToken } from "../token-types";
import type { IVersionAndFlags } from "./VersionAndFlags";

/**
 * Atom: Sample Description Atom ('stsd')
 */
export interface IAtomStsdHeader extends IVersionAndFlags {
  numberOfEntries: number;
}

/**
 * Atom: Sample Description Atom ('stsd')
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25691
 */
export const stsdHeader: IGetToken<IAtomStsdHeader> = {
  len: 8,

  get: (buf: Uint8Array, off: number): IAtomStsdHeader => {
    return {
      version: UINT8.get(buf, off),
      flags: UINT24_BE.get(buf, off + 1),
      numberOfEntries: UINT32_BE.get(buf, off + 4),
    };
  },
};
