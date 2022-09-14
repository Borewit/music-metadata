import { INT32_BE, INT8, INT24_BE } from "../token-types";

import { readTokenTable } from "./readTokenTable";

import type { IGetToken } from "../strtok3";
import type { ITableAtom } from "./AtomTable";

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

  public get(buf: Uint8Array, off: number): IStszAtom {
    const nrOfEntries = INT32_BE.get(buf, off + 8);

    return {
      version: INT8.get(buf, off),
      flags: INT24_BE.get(buf, off + 1),
      sampleSize: INT32_BE.get(buf, off + 4),
      numberOfEntries: nrOfEntries,
      entries: readTokenTable(buf, INT32_BE, off + 12, this.len - 12, nrOfEntries),
    };
  }
}
