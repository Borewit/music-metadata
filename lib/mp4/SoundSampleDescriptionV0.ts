import { INT16_BE, UINT16_BE } from "../token-types";

import type { IGetToken } from "../token-types";

export interface ISoundSampleDescriptionV0 {
  numAudioChannels: number;
  /**
   * Number of bits in each uncompressed sound sample
   */
  sampleSize: number;
  /**
   * Compression ID
   */
  compressionId: number;

  packetSize: number;

  sampleRate: number;
}

/**
 * Sound Sample Description (Version 0)
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap3/qtff3.html#//apple_ref/doc/uid/TP40000939-CH205-130736
 */
export const SoundSampleDescriptionV0: IGetToken<ISoundSampleDescriptionV0> = {
  len: 12,

  get(buf: Uint8Array, off: number): ISoundSampleDescriptionV0 {
    return {
      numAudioChannels: INT16_BE.get(buf, off + 0),
      sampleSize: INT16_BE.get(buf, off + 2),
      compressionId: INT16_BE.get(buf, off + 4),
      packetSize: INT16_BE.get(buf, off + 6),
      sampleRate: UINT16_BE.get(buf, off + 8) + UINT16_BE.get(buf, off + 10) / 10_000,
    };
  },
};
