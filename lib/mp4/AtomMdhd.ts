import { UINT8, UINT24_BE, UINT32_BE, UINT16_BE } from "../token-types";

import { FixedLengthAtom } from "./AtomFixedLength";
import { SecondsSinceMacEpoch } from "./SecondsSinceMacEpoch";

import type { IGetToken } from "../strtok3";
import type { IAtomMxhd } from "./AtomMxhd";

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
  public constructor(public override len: number) {
    super(len, 24, "mdhd");
  }

  public get(buf: Uint8Array, off: number): IAtomMdhd {
    return {
      version: UINT8.get(buf, off + 0),
      flags: UINT24_BE.get(buf, off + 1),
      creationTime: SecondsSinceMacEpoch.get(buf, off + 4),
      modificationTime: SecondsSinceMacEpoch.get(buf, off + 8),
      timeScale: UINT32_BE.get(buf, off + 12),
      duration: UINT32_BE.get(buf, off + 16),
      language: UINT16_BE.get(buf, off + 20),
      quality: UINT16_BE.get(buf, off + 22),
    };
  }
}
