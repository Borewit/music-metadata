import * as Token from "../token-types";
import type { IToken, IGetToken } from "../strtok3";

/**
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap1/qtff1.html#//apple_ref/doc/uid/TP40000939-CH203-38190
 */
export const ExtendedSize: IToken<bigint> = Token.UINT64_BE;

export interface ISoundSampleDescriptionVersion {
  version: number;
  revision: number;
  vendor: number;
}

/**
 * Common Sound Sample Description (version & revision)
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap3/qtff3.html#//apple_ref/doc/uid/TP40000939-CH205-57317
 */
export const SoundSampleDescriptionVersion: IGetToken<ISoundSampleDescriptionVersion> = {
  len: 8,

  get(buf: Uint8Array, off: number): ISoundSampleDescriptionVersion {
    return {
      version: Token.INT16_BE.get(buf, off),
      revision: Token.INT16_BE.get(buf, off + 2),
      vendor: Token.INT32_BE.get(buf, off + 4),
    };
  },
};
