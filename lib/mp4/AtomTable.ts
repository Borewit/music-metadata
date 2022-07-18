import * as Token from "../token-types";
import { IGetToken } from "../strtok3";
import { IVersionAndFlags } from "./VersionAndFlags";
import { readTokenTable } from "./readTokenTable";

export interface ITableAtom<T> extends IVersionAndFlags {
  numberOfEntries: number;
  entries: T[];
}

export class SimpleTableAtom<T> implements IGetToken<ITableAtom<T>> {
  public constructor(public len: number, private token: IGetToken<T>) {}

  public get(buf: Uint8Array, off: number): ITableAtom<T> {
    const nrOfEntries = Token.INT32_BE.get(buf, off + 4);

    return {
      version: Token.INT8.get(buf, off + 0),
      flags: Token.INT24_BE.get(buf, off + 1),
      numberOfEntries: nrOfEntries,
      entries: readTokenTable(buf, this.token, off + 8, this.len - 8, nrOfEntries),
    };
  }
}
