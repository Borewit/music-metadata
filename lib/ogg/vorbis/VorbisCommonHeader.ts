import { UINT8 } from "../../token-types";
import { Latin1StringType } from "../../token-types/string";

import type { IGetToken } from "../../strtok3";

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

  get: (buf: Uint8Array, off): ICommonHeader => {
    return {
      packetType: UINT8.get(buf, off),
      vorbis: new Latin1StringType(6).get(buf, off + 1),
    };
  },
};
