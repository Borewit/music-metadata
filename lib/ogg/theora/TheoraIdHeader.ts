import { UINT8, UINT16_BE, UINT24_BE } from "../../token-types";
import { Latin1StringType } from "../../token-types/string";

import type { IGetToken } from "../../strtok3";

/**
 * 6.2 Identification Header
 * Ref: https://theora.org/doc/Theora.pdf: 6.2 Identification Header Decode
 */
export interface IIdentificationHeader {
  // Signature: 0x80 + 'theora'
  id: string;
  // The major version number
  vmaj: number;
  // The minor version number
  vmin: number;
  // The version revision number.
  vrev: number;
  // The width of the frame in macro blocks
  vmbw: number;
  // The height of the frame in macro blocks
  vmbh: number;
  // The nominal bitrate of the stream, in bits per second.
  nombr: number;
  // The quality hint.
  nqual: number;
}

/**
 * 6.2 Identification Header
 * Ref: https://theora.org/doc/Theora.pdf: 6.2 Identification Header Decode
 */
export const IdentificationHeader: IGetToken<IIdentificationHeader> = {
  len: 42,

  get: (buf: Uint8Array, off): IIdentificationHeader => {
    return {
      id: new Latin1StringType(7).get(buf, off),
      vmaj: UINT8.get(buf, off + 7),
      vmin: UINT8.get(buf, off + 8),
      vrev: UINT8.get(buf, off + 9),
      vmbw: UINT16_BE.get(buf, off + 10),
      vmbh: UINT16_BE.get(buf, off + 17),
      nombr: UINT24_BE.get(buf, off + 37),
      nqual: UINT8.get(buf, off + 40),
    };
  },
};
