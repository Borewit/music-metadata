import * as Token from "token-types";

/**
 * Info Tag: Xing, LAME
 */
export const InfoTagHeaderTag = new Token.StringType(4, 'ascii');

/**
 * LAME TAG value
 * Did not find any official documentation for this
 * Value e.g.: "3.98.4"
 */
export const LameEncoderVersion = new Token.StringType(6, 'ascii');

export interface IXingInfoTag {

  headerFlags: Buffer,

  /**
   * total bit stream frames from Vbr header data
   */
  numFrames: number,

  /**
   * Actual stream size = file size - header(s) size [bytes]
   */
  streamSize: number,

  /**
   * the number of header data bytes (from original file)
   */
  vbrScale: number,

  /**
   * LAME Tag, extends the Xing header format
   * First added in LAME 3.12 for VBR
   * The modified header is also included in CBR files (effective LAME 3.94), with "Info" instead of "XING" near the beginning.
   */

  //  Initial LAME info, e.g.: LAME3.99r
  codec: string,
  /**
   * Info tag revision
   */
  infoTagRevision: number,
  /**
   * VBR method
   */
  vbrMethod: number;
}

/**
 * Info Tag
 * Ref: http://gabriel.mp3-tech.org/mp3infotag.html
 */
export const XingInfoTag: Token.IGetToken<IXingInfoTag> = {
  len: 136, // 140 bytes - 4 bytes TAG = 136 + 7 byte extension

  get: (buf, off) => {
    return {

      // === ZONE A - Traditional Xing VBR Tag data ===

      // 4 bytes for HeaderFlags
      headerFlags: new Token.BufferType(4).get(buf, off),

      numFrames: Token.UINT32_BE.get(buf, off + 4),

      streamSize: Token.UINT32_BE.get(buf, off + 8),

      // the number of header data bytes (from original file)
      vbrScale: Token.UINT32_BE.get(buf, off + 112),

      /**
       * LAME Tag, extends the Xing header format
       * First added in LAME 3.12 for VBR
       * The modified header is also included in CBR files (effective LAME 3.94), with "Info" instead of "XING" near the beginning.
       */

      // === ZONE B - Initial LAME info  ===

      //  Initial LAME info, e.g.: LAME3.99r
      codec: new Token.StringType(9, 'ascii').get(buf, off + 116), // bytes $9A-$A => 154-164 (offset doc - 38)
      // 	 Info tag revision
      infoTagRevision: Token.UINT8.get(buf, off + 125) >> 4,
      // VBR method
      vbrMethod: Token.UINT8.get(buf, off + 125) & 0xf // $A5
    };
  }
};
