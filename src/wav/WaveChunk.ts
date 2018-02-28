import * as Token from "token-types";
import * as assert from "assert";
import {IChunkHeader} from "../riff/RiffChunk";

/**
 * "fmt"  sub-chunk describes the sound data's format
 * Ref: http://soundfile.sapp.org/doc/WaveFormat
 */
export interface IFormat {
  /**
   * PCM = 1 (i.e. Linear quantization). Values other than 1 indicate some form of compression.
   */
  audioFormat: number,
  /**
   * Mono = 1, Stereo = 2, etc.
   */
  numChannels: number,
  /**
   * 8000, 44100, etc.
   */
  sampleRate: number,
  byteRate: number,
  blockAlign: number,
  bitsPerSample: number
}

/**
 * format chunk; chunk-id is "fmt "
 * http://soundfile.sapp.org/doc/WaveFormat/
 */
export class Format implements Token.IGetToken<IFormat> {

  public len: number;

  public constructor(header: IChunkHeader) {
    assert.ok(header.size >= 16, "16 for PCM.");
    this.len = header.size;
  }

  public get(buf: Buffer, off: number): IFormat {
    return {
      audioFormat: buf.readUInt16LE(off),
      numChannels: buf.readUInt16LE(off + 2),
      sampleRate: buf.readUInt32LE(off + 4),
      byteRate: buf.readUInt32LE(off + 8),
      blockAlign: buf.readUInt16LE(off + 12),
      bitsPerSample: buf.readUInt16LE(off + 14)
    };
  }

}
