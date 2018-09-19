import * as Token from 'token-types';

import common from '../common/Util';

/**
 * The picture type according to the ID3v2 APIC frame
 * Ref: http://id3.org/id3v2.3.0#Attached_picture
 */
export enum AttachedPictureType {
  'Other',
  "32x32 pixels 'file icon' (PNG only)",
  'Other file icon',
  'Cover (front)',
  'Cover (back)',
  'Leaflet page',
  'Media (e.g. label side of CD)',
  'Lead artist/lead performer/soloist',
  'Artist/performer',
  'Conductor',
  'Band/Orchestra',
  'Composer',
  'Lyricist/text writer',
  'Recording Location',
  'During recording',
  'During performance',
  'Movie/video screen capture',
  'A bright coloured fish',
  'Illustration',
  'Band/artist logotype',
  'Publisher/Studio logotype'
}

export interface IExtendedHeader {
  // Extended header size
  size: number;
  extendedFlags: number;
  // Size of padding
  sizeOfPadding: number;
  // CRC data present
  crcDataPresent: boolean;
}

/**
 * ID3v2 tag header
 */
export interface IID3v2header {
// ID3v2/file identifier   "ID3"
  fileIdentifier: string,
  // ID3v2 versionIndex
  version: {
    major: number,
    revision: number
  },
  // ID3v2 flags
  flags: {
    // Raw flags value
    raw: number,
    // Unsynchronisation
    unsynchronisation: boolean,
    // Extended header
    isExtendedHeader: boolean
    // Experimental indicator
    expIndicator: boolean,
    footer: boolean
  };
  size: number;
}

export class ID3v2Token {

  /**
   * 28 bits (representing up to 256MB) integer, the msb is 0 to avoid 'false syncsignals'.
   * 4 * %0xxxxxxx
   */
  public static UINT32SYNCSAFE = {
    get: (buf: Buffer, off: number): number => {
      return buf[off + 3] & 0x7f | ((buf[off + 2]) << 7) |
        ((buf[off + 1]) << 14) | ((buf[off]) << 21);
    },
    len: 4
  };

  /**
   * ID3v2 header
   * Ref: http://id3.org/id3v2.3.0#ID3v2_header
   * ToDo
   */
  public static Header: Token.IGetToken<IID3v2header> = {
    len: 10,

    get: (buf, off): IID3v2header => {
      return {
        // ID3v2/file identifier   "ID3"
        fileIdentifier: new Token.StringType(3, 'ascii').get(buf, off),
        // ID3v2 versionIndex
        version: {
          major: Token.INT8.get(buf, off + 3),
          revision: Token.INT8.get(buf, off + 4)
        },
        // ID3v2 flags
        flags: {
          // Raw flags value
          raw: Token.INT8.get(buf, off + 4),
          // Unsynchronisation
          unsynchronisation: common.strtokBITSET.get(buf, off + 5, 7),
          // Extended header
          isExtendedHeader: common.strtokBITSET.get(buf, off + 5, 6),
          // Experimental indicator
          expIndicator: common.strtokBITSET.get(buf, off + 5, 5),
          footer: common.strtokBITSET.get(buf, off + 5, 4)
        },
        size: ID3v2Token.UINT32SYNCSAFE.get(buf, off + 6)
      };
    }
  };

  public static ExtendedHeader: Token.IGetToken<IExtendedHeader> = {
    len: 10,

    get: (buf, off): IExtendedHeader => {
      return {
        // Extended header size
        size: Token.UINT32_BE.get(buf, off),
        // Extended Flags
        extendedFlags: Token.UINT16_BE.get(buf, off + 4),
        // Size of padding
        sizeOfPadding: Token.UINT32_BE.get(buf, off + 6),
        // CRC data present
        crcDataPresent: common.strtokBITSET.get(buf, off + 4, 31)
      };
    }
  };
}
