import * as Token from "../token-types";
import { IGetToken } from "../strtok3";
import { ITableAtom } from "./AtomTable";
import { readTokenTable } from "./readTokenTable";

/**
 * Sample-size ('stsz') atom interface
 */
export interface IStszAtom extends ITableAtom<number> {
  sampleSize: number;
}

/**
 * Sample-size ('stsz') atom
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25710
 */
export class StszAtom implements IGetToken<IStszAtom> {
  public constructor(public len: number) {}

  public get(buf: Buffer, off: number): IStszAtom {
    const nrOfEntries = Token.INT32_BE.get(buf, off + 8);

    return {
      version: Token.INT8.get(buf, off),
      flags: Token.INT24_BE.get(buf, off + 1),
      sampleSize: Token.INT32_BE.get(buf, off + 4),
      numberOfEntries: nrOfEntries,
      entries: readTokenTable(buf, Token.INT32_BE, off + 12, this.len - 12, nrOfEntries),
    };
  }
}
