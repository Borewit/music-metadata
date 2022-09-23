import { UINT16_LE } from "../token-types";

import type { IGetToken } from "../token-types";

/**
 * 3.5: The Codec-List-Object interface.
 */
interface ICodecListObjectHeader {
  entryCount: number;
}

/**
 * 3.5: The Codec List Object provides user-friendly information about the codecs and formats used to encode the content found in the ASF file.
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_5
 */
export const CodecListObjectHeader: IGetToken<ICodecListObjectHeader> = {
  len: 20,
  get: (buf: Uint8Array, off: number): ICodecListObjectHeader => {
    return {
      entryCount: UINT16_LE.get(buf, off + 16),
    };
  },
};
