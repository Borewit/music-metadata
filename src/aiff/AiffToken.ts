import * as Token from "token-types";
import * as assert from "assert";
import {FourCcToken} from "../common/FourCC";
import * as iff from '../iff';

/**
 * The Common Chunk.
 * Describes fundamental parameters of the waveform data such as sample rate, bit resolution, and how many channels of
 * digital audio are stored in the FORM AIFF.
 */
export interface ICommon {
  numChannels: number,
  numSampleFrames: number,
  sampleSize: number,
  sampleRate: number,
  compressionType?: string,
  compressionName?: string
}

export class Common implements Token.IGetToken<ICommon> {

  public len: number;

  public constructor(header: iff.IChunkHeader, private isAifc: boolean) {
    const minimumChunkSize = isAifc ? 22 : 18;
    assert.ok(header.chunkSize >= minimumChunkSize, `COMMON CHUNK size should always be at least ${minimumChunkSize}`);
    this.len = header.chunkSize;
  }

  public get(buf: Buffer, off: number): ICommon {

    // see: https://cycling74.com/forums/aiffs-80-bit-sample-rate-value
    const shift = buf.readUInt16BE(off + 8) - 16398;
    const baseSampleRate = buf.readUInt16BE(off + 8 + 2);

    const res: ICommon = {
      numChannels: buf.readUInt16BE(off),
      numSampleFrames: buf.readUInt32BE(off + 2),
      sampleSize: buf.readUInt16BE(off + 6),
      sampleRate: shift < 0 ? baseSampleRate >> Math.abs(shift) : baseSampleRate << shift
    };

    if (this.isAifc) {
      res.compressionType = FourCcToken.get(buf, off + 18);
      if (this.len > 22) {
        const strLen = buf.readInt8(off + 22);
        const padding = (strLen + 1) % 2;
        if (23 + strLen + padding === this.len) {
          res.compressionName = new Token.StringType(strLen, 'binary').get(buf, off + 23);
        } else {
         throw new Error('Illegal pstring length');
        }
      }
    } else {
      res.compressionName = 'PCM';
    }

    return res;
  }

}
