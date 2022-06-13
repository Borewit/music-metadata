import * as Token from "../token-types";
import { IGetToken } from "../strtok3";
import { IVersionAndFlags } from "./VersionAndFlags";

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

  get: (buf: Buffer, off: number): IAtomStsdHeader => {
    return {
      version: Token.UINT8.get(buf, off),
      flags: Token.UINT24_BE.get(buf, off + 1),
      numberOfEntries: Token.UINT32_BE.get(buf, off + 4),
    };
  },
};
