import { UINT8, UINT24_BE, Uint8ArrayType } from "../token-types";

import type { IGetToken } from "../token-types";

/**
 * Data Atom Structure ('data')
 * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW32
 */
export interface IDataAtom {
  /**
   * Type Indicator
   * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW28
   */
  type: {
    /**
     * The set of types from which the type is drawn
     * If 0, type is drawn from the well-known set of types.
     */
    set: number; // ToDo: enum?
    type: number;
  };
  /**
   * Locale Indicator
   */
  locale: number;
  /**
   * An array of bytes containing the value of the metadata.
   */
  value: Uint8Array;
}

/**
 * Data Atom Structure
 */
export class DataAtom implements IGetToken<IDataAtom> {
  public constructor(public len: number) {}

  public get(buf: Uint8Array, off: number): IDataAtom {
    return {
      type: {
        set: UINT8.get(buf, off + 0),
        type: UINT24_BE.get(buf, off + 1),
      },
      locale: UINT24_BE.get(buf, off + 4),
      value: new Uint8ArrayType(this.len - 8).get(buf, off + 8),
    };
  }
}
