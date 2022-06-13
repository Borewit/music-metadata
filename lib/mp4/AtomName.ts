import * as Token from "../token-types";
import { IGetToken } from "../strtok3";
import { IVersionAndFlags } from "./VersionAndFlags";

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

  public get(buf: Buffer, off: number): INameAtom {
    return {
      version: Token.UINT8.get(buf, off),
      flags: Token.UINT24_BE.get(buf, off + 1),
      name: new Token.StringType(this.len - 4, "utf-8").get(buf, off + 4),
    };
  }
}
