import { UINT8, UINT24_BE, UINT32_BE } from "../token-types";

import type { IGetToken } from "../strtok3";
import type { IVersionAndFlags } from "./VersionAndFlags";

/**
 * Interface for the metadata header atom: 'mhdr'
 * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW13
 */
export interface IMovieHeaderAtom extends IVersionAndFlags {
  /**
   * A 32-bit unsigned integer indicating the value to use for the item ID of the next item created or assigned an item ID.
   * If the value is all ones, it indicates that future additions will require a search for an unused item ID.
   */
  nextItemID: number;
}

/**
 * Token: Movie Header Atom
 */
export const mhdr: IGetToken<IMovieHeaderAtom> = {
  len: 8,

  get: (buf: Uint8Array, off: number): IMovieHeaderAtom => {
    return {
      version: UINT8.get(buf, off),
      flags: UINT24_BE.get(buf, off + 1),
      nextItemID: UINT32_BE.get(buf, off + 4),
    };
  },
};
