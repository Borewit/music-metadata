import { UINT8, INT16_LE, INT32_LE } from "../../token-types";
import { Latin1StringType } from "../../token-types/string";

import type { IGetToken } from "../../token-types";

/**
 * Opus ID Header interface
 * Ref: https://wiki.xiph.org/OggOpus#ID_Header
 */
export interface IIdHeader {
  /**
   * Magic signature: "OpusHead" (64 bits)
   */
  magicSignature: string;
  /**
   * Version number (8 bits unsigned): 0x01 for this spec
   */
  version: number;
  /**
   * Channel count 'c' (8 bits unsigned): MUST be > 0
   */
  channelCount: number;
  /**
   * Pre-skip (16 bits unsigned, little endian)
   */
  preSkip: number;
  /**
   * Input sample rate (32 bits unsigned, little endian): informational only
   */
  inputSampleRate: number;
  /**
   * Output gain (16 bits, little endian, signed Q7.8 in dB) to apply when decoding
   */
  outputGain: number;
  /**
   * Channel mapping family (8 bits unsigned)
   * -  0 = one stream: mono or L,R stereo
   * -  1 = channels in vorbis spec order: mono or L,R stereo or ... or FL,C,FR,RL,RR,LFE, ...
   * -  2..254 = reserved (treat as 255)
   * -  255 = no defined channel meaning
   */
  channelMapping: number;
}

/**
 * Opus ID Header parser
 * Ref: https://wiki.xiph.org/OggOpus#ID_Header
 */
export class IdHeader implements IGetToken<IIdHeader> {
  constructor(public len: number) {
    if (len < 19) {
      throw new Error("ID-header-page 0 should be at least 19 bytes long");
    }
  }

  public get(buf: Uint8Array, off: number): IIdHeader {
    return {
      magicSignature: new Latin1StringType(8).get(buf, off + 0),
      version: UINT8.get(buf, off + 8),
      channelCount: UINT8.get(buf, off + 9),
      preSkip: INT16_LE.get(buf, off + 10),
      inputSampleRate: INT32_LE.get(buf, off + 12),
      outputGain: INT16_LE.get(buf, off + 16),
      channelMapping: UINT8.get(buf, off + 18),
    };
  }
}
