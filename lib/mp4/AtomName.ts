import { UINT8, UINT24_BE } from "../token-types";
import { Utf8StringType } from "../token-types/string";

import type { IGetToken } from "../strtok3";
import type { IVersionAndFlags } from "./VersionAndFlags";

/**
 * Data Atom Structure ('data')
 * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW32
 */
export interface INameAtom extends IVersionAndFlags {
  /**
   * An array of bytes containing the value of the metadata.
   */
  name: string;
}

/**
 * Data Atom Structure
 * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW31
 */
export class NameAtom implements IGetToken<INameAtom> {
  public constructor(public len: number) {}

  public get(buf: Uint8Array, off: number): INameAtom {
    return {
      version: UINT8.get(buf, off),
      flags: UINT24_BE.get(buf, off + 1),
      name: new Utf8StringType(this.len - 4).get(buf, off + 4),
    };
  }
}
