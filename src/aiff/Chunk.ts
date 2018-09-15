import * as Token from "token-types";
import * as assert from "assert";
import {FourCcToken} from "../common/FourCC";

export interface IChunkHeader {

  /**
   * 	A chunk ID (ie, 4 ASCII bytes)
   */
  chunkID: string,
  /**
   * Number of data bytes following this data header
   */
  size: number
}

/**
 * Common AIFF chunk header
 */
export const Header: Token.IGetToken<IChunkHeader> = {
  len: 8,

  get: (buf, off): IChunkHeader => {
    return {
      // Group-ID
      chunkID: FourCcToken.get(buf, off),
      // Size
      size: buf.readUInt32BE(off + 4)
    };
  }
};

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
}

export class Common implements Token.IGetToken<ICommon> {

  public len: number;

  public constructor(header: IChunkHeader) {
    assert.ok(header.size >= 18, "chunkSize should always be at least 18");
    this.len = header.size;
  }

  public get(buf: Buffer, off: number): ICommon {

    // see: https://cycling74.com/forums/aiffs-80-bit-sample-rate-value
    const shift = buf.readUInt16BE(off + 8) - 16398;
    const baseSampleRate = buf.readUInt16BE(off + 8 + 2);

    return {
      numChannels: buf.readUInt16BE(off),
      numSampleFrames: buf.readUInt32BE(off + 2),
      sampleSize: buf.readUInt16BE(off + 6),
      sampleRate: shift < 0 ? baseSampleRate >> Math.abs(shift) : baseSampleRate << shift
    };
  }

}
