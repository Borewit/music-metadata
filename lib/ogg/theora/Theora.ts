import * as Token from 'token-types';
import type { IGetToken } from 'strtok3';

/**
 * 6.2 Identification Header
 * Ref: https://theora.org/doc/Theora.pdf: 6.2 Identification Header Decode
 */
export interface IIdentificationHeader {
  // Signature: 0x80 + 'theora'
  id: string,
  // The major version number
  vmaj: number,
  // The minor version number
  vmin: number,
  // The version revision number.
  vrev: number,
  // The width of the frame in macro blocks
  vmbw: number,
  // The height of the frame in macro blocks
  vmbh: number,
  // The nominal bitrate of the stream, in bits per second.
  nombr: number,
  // The quality hint.
  nqual: number,
}

/**
 * 6.2 Identification Header
 * Ref: https://theora.org/doc/Theora.pdf: 6.2 Identification Header Decode
 */
export const IdentificationHeader: IGetToken<IIdentificationHeader> = {
  len: 42,

  get: (buf: Uint8Array, off): IIdentificationHeader => {
    return {
      id: new Token.StringType(7, 'ascii').get(buf, off),
      vmaj: Token.UINT8.get(buf, off + 7),
      vmin: Token.UINT8.get(buf, off + 8),
      vrev: Token.UINT8.get(buf, off + 9),
      vmbw: Token.UINT16_BE.get(buf, off + 10),
      vmbh: Token.UINT16_BE.get(buf, off + 17),
      nombr: Token.UINT24_BE.get(buf, off + 37),
      nqual: Token.UINT8.get(buf, off + 40)
    };
  }
};
