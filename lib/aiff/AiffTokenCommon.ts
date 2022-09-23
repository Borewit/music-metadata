import { FourCcToken } from "../common/FourCC";
import { UINT16_BE, UINT32_BE, INT8 } from "../token-types";
import { Latin1StringType } from "../token-types/string";

import type * as iff from "../iff";
import type { IGetToken } from "../token-types";


/**
 * The Common Chunk.
 * Describes fundamental parameters of the waveform data such as sample rate, bit resolution, and how many channels of
 * digital audio are stored in the FORM AIFF.
 */
export interface ICommon {
  numChannels: number;
  numSampleFrames: number;
  sampleSize: number;
  sampleRate: number;
  compressionType?: string;
  compressionName?: string | undefined;
}

export class Common implements IGetToken<ICommon> {
  public len: number;

  public constructor(header: iff.IChunkHeader, private isAifc: boolean) {
    const minimumChunkSize = isAifc ? 22 : 18;
    if (header.chunkSize < minimumChunkSize)
      throw new Error(`COMMON CHUNK size should always be at least ${minimumChunkSize}`);
    this.len = header.chunkSize;
  }

  public get(buf: Uint8Array, off: number): ICommon {
    // see: https://cycling74.com/forums/aiffs-80-bit-sample-rate-value
    const shift = UINT16_BE.get(buf, off + 8) - 16_398;
    const baseSampleRate = UINT16_BE.get(buf, off + 8 + 2);

    const res: ICommon = {
      numChannels: UINT16_BE.get(buf, off),
      numSampleFrames: UINT32_BE.get(buf, off + 2),
      sampleSize: UINT16_BE.get(buf, off + 6),
      sampleRate: shift < 0 ? baseSampleRate >> Math.abs(shift) : baseSampleRate << shift,
    };

    if (this.isAifc) {
      res.compressionType = FourCcToken.get(buf, off + 18);
      if (this.len > 22) {
        const strLen = INT8.get(buf, off + 22);
        if (strLen > 0) {
          const padding = (strLen + 1) % 2;
          if (23 + strLen + padding === this.len) {
            res.compressionName = new Latin1StringType(strLen).get(buf, off + 23);
          } else {
            throw new Error("Illegal pstring length");
          }
        } else {
          res.compressionName = undefined;
        }
      }
    } else {
      res.compressionName = "PCM";
    }

    return res;
  }
}
