import * as Token from "../token-types";
import { IGetToken } from "../strtok3";

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
  value: Buffer;
}

/**
 * Data Atom Structure
 */
export class DataAtom implements IGetToken<IDataAtom> {
  public constructor(public len: number) {}

  public get(buf: Uint8Array, off: number): IDataAtom {
    return {
      type: {
        set: Token.UINT8.get(buf, off + 0),
        type: Token.UINT24_BE.get(buf, off + 1),
      },
      locale: Token.UINT24_BE.get(buf, off + 4),
      value: Buffer.from(
        new Token.Uint8ArrayType(this.len - 8).get(buf, off + 8)
      ),
    };
  }
}
