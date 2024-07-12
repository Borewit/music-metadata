import * as Token from 'token-types';
import type { IGetToken } from 'strtok3';

import * as util from '../../common/Util.js';

/**
 * Speex Header Packet
 * Ref: https://www.speex.org/docs/manual/speex-manual/node8.html#SECTION00830000000000000000
 */
export interface IHeader {
  /**
   * speex_string, char[] 8
   */
  speex: string,
  /**
   * speex_version, char[] 20
   */
  version: string,
  /**
   * Version id
   */
  version_id: number,
  header_size: number,
  rate: number,
  mode: number,
  mode_bitstream_version: number,
  nb_channels: number,
  bitrate: number,
  frame_size: number,
  vbr: number,
  frames_per_packet: number,
  extra_headers: number,
  reserved1: number,
  reserved2: number
}

/**
 * Speex Header Packet
 * Ref: https://www.speex.org/docs/manual/speex-manual/node8.html#SECTION00830000000000000000
 */
export const Header: IGetToken<IHeader> = {

  len: 80,

  get: (buf: Uint8Array, off) => {

    return {
      speex: new Token.StringType(8, 'ascii').get(buf, off + 0),
      version: util.trimRightNull(new Token.StringType(20, 'ascii').get(buf, off + 8)),
      version_id: Token.INT32_LE.get(buf, off + 28),
      header_size: Token.INT32_LE.get(buf, off + 32),
      rate: Token.INT32_LE.get(buf, off + 36),
      mode: Token.INT32_LE.get(buf, off + 40),
      mode_bitstream_version: Token.INT32_LE.get(buf, off + 44),
      nb_channels: Token.INT32_LE.get(buf, off + 48),
      bitrate: Token.INT32_LE.get(buf, off + 52),
      frame_size: Token.INT32_LE.get(buf, off + 56),
      vbr:Token.INT32_LE.get(buf, off + 60),
      frames_per_packet: Token.INT32_LE.get(buf, off + 64),
      extra_headers: Token.INT32_LE.get(buf, off + 68),
      reserved1: Token.INT32_LE.get(buf, off + 72),
      reserved2: Token.INT32_LE.get(buf, off + 76)
    };
  }
};
