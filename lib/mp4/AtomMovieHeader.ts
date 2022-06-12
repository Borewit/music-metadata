import * as Token from "../token-types";
import { IGetToken } from "../strtok3";
import { IVersionAndFlags } from "./VersionAndFlags";

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

  get: (buf: Buffer, off: number): IMovieHeaderAtom => {
    return {
      version: Token.UINT8.get(buf, off),
      flags: Token.UINT24_BE.get(buf, off + 1),
      nextItemID: Token.UINT32_BE.get(buf, off + 4),
    };
  },
};
