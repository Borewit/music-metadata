import * as Token from "../token-types";
import { IGetToken } from "../strtok3";
import { IAtomMxhd } from "./AtomMxhd";
import { SecondsSinceMacEpoch } from "./SecondsSinceMacEpoch";
import { FixedLengthAtom } from "./AtomFixedLength";

/**
 * Interface for the parsed Movie Header Atom (mdhd)
 */
export interface IAtomMdhd extends IAtomMxhd {
  /**
   * A 16-bit integer that specifies the language code for this media.
   * See Language Code Values for valid language codes.
   * Also see Extended Language Tag Atom for the preferred code to use here if an extended language tag is also included in the media atom.
   * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/QTFFChap4/qtff4.html#//apple_ref/doc/uid/TP40000939-CH206-34353
   */
  language: number;

  quality: number;
}

/**
 * Token: Media Header Atom
 * Ref:
 * - https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-SW34
 * - https://wiki.multimedia.cx/index.php/QuickTime_container#mdhd
 */
export class MdhdAtom extends FixedLengthAtom implements IGetToken<IAtomMdhd> {
  public constructor(public len: number) {
    super(len, 24, "mdhd");
  }

  public get(buf: Buffer, off: number): IAtomMdhd {
    return {
      version: Token.UINT8.get(buf, off + 0),
      flags: Token.UINT24_BE.get(buf, off + 1),
      creationTime: SecondsSinceMacEpoch.get(buf, off + 4),
      modificationTime: SecondsSinceMacEpoch.get(buf, off + 8),
      timeScale: Token.UINT32_BE.get(buf, off + 12),
      duration: Token.UINT32_BE.get(buf, off + 16),
      language: Token.UINT16_BE.get(buf, off + 20),
      quality: Token.UINT16_BE.get(buf, off + 22),
    };
  }
}
