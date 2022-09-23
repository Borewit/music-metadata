import { INT32_BE, INT8, INT24_BE } from "../token-types";

import { readTokenTable } from "./readTokenTable";

import type { IGetToken } from "../token-types";
import type { IVersionAndFlags } from "./VersionAndFlags";

export interface ITableAtom<T> extends IVersionAndFlags {
  numberOfEntries: number;
  entries: T[];
}

export class SimpleTableAtom<T> implements IGetToken<ITableAtom<T>> {
  public constructor(public len: number, private token: IGetToken<T>) {}

  public get(buf: Uint8Array, off: number): ITableAtom<T> {
    const nrOfEntries = INT32_BE.get(buf, off + 4);

    return {
      version: INT8.get(buf, off + 0),
      flags: INT24_BE.get(buf, off + 1),
      numberOfEntries: nrOfEntries,
      entries: readTokenTable(buf, this.token, off + 8, this.len - 8, nrOfEntries),
    };
  }
}
