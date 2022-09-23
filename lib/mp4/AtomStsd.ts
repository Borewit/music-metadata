import { UINT32_BE } from "../token-types";

import { IAtomStsdHeader, stsdHeader } from "./AtomStsdHeader";
import { ISampleDescription, SampleDescriptionTable } from "./SampleDescription";

import type { IGetToken } from "../token-types";


export interface IAtomStsd {
  header: IAtomStsdHeader;
  table: ISampleDescription[];
}

/**
 * Atom: Sample-description Atom ('stsd')
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25691
 */
export class StsdAtom implements IGetToken<IAtomStsd> {
  public constructor(public len: number) {}

  public get(buf: Uint8Array, off: number): IAtomStsd {
    const header = stsdHeader.get(buf, off);
    off += stsdHeader.len;

    const table: ISampleDescription[] = [];

    for (let n = 0; n < header.numberOfEntries; ++n) {
      const size = UINT32_BE.get(buf, off); // Sample description size
      off += UINT32_BE.len;
      table.push(new SampleDescriptionTable(size).get(buf, off));
      off += size;
    }

    return {
      header,
      table,
    };
  }
}
