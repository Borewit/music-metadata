import * as Token from "../../token-types";
import { IGetToken } from "../../strtok3";

/**
 * Vorbis 1 decoding tokens
 * Ref: https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-620004.2.1
 */

/**
 * Comment header interface
 * Ref: https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-620004.2.1
 */
export interface ICommonHeader {
  /**
   * Packet Type
   */
  packetType: number;
  /**
   * Should be 'vorbis'
   */
  vorbis: string;
}

/**
 * Comment header decoder
 * Ref: https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-620004.2.1
 */
export const CommonHeader: IGetToken<ICommonHeader> = {
  len: 7,

  get: (buf: Buffer, off): ICommonHeader => {
    return {
      packetType: buf.readUInt8(off),
      vorbis: new Token.StringType(6, "ascii").get(buf, off + 1),
    };
  },
};
