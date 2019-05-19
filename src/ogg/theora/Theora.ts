import { IFormatInfo } from '../vorbis/Vorbis';
import * as Token from 'token-types';

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
export const IdentificationHeader: Token.IGetToken<IIdentificationHeader> = {
  len: 42,

  get: (buf, off): IIdentificationHeader => {
    return {
      id: new Token.StringType(7, 'ascii').get(buf, off),
      vmaj: buf.readUInt8(off + 7),
      vmin: buf.readUInt8(off + 8),
      vrev: buf.readUInt8(off + 9),
      vmbw: buf.readUInt16BE(off + 10),
      vmbh: buf.readUInt16BE(off + 17),
      nombr: Token.UINT24_BE.get(buf, off + 37),
      nqual: buf.readUInt8(off + 40)
    };
  }
};
