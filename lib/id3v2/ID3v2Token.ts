import * as Token from 'token-types';
import * as util from '../common/Util';
import { IGetToken } from 'strtok3/lib/core';

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

export type ID3v2MajorVersion = 2 | 3 | 4;

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
 * 28 bits (representing up to 256MB) integer, the msb is 0 to avoid 'false syncsignals'.
 * 4 * %0xxxxxxx
 */
export const UINT32SYNCSAFE = {
  get: (buf: Uint8Array, off: number): number => {
    return buf[off + 3] & 0x7f | ((buf[off + 2]) << 7) |
      ((buf[off + 1]) << 14) | ((buf[off]) << 21);
  },
  len: 4
};

/**
 * ID3v2 tag header
 */
export interface IID3v2header {
  // ID3v2/file identifier   "ID3"
  fileIdentifier: string,
  // ID3v2 versionIndex
  version: {
    major: ID3v2MajorVersion,
    revision: number
  },
  // ID3v2 flags
  flags: {
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

/**
 * ID3v2 header
 * Ref: http://id3.org/id3v2.3.0#ID3v2_header
 * ToDo
 */
export const ID3v2Header: IGetToken<IID3v2header> = {
  len: 10,

  get: (buf: Buffer, off): IID3v2header => {
    return {
      // ID3v2/file identifier   "ID3"
      fileIdentifier: new Token.StringType(3, 'ascii').get(buf, off),
      // ID3v2 versionIndex
      version: {
        major: Token.INT8.get(buf, off + 3) as ID3v2MajorVersion,
        revision: Token.INT8.get(buf, off + 4)
      },
      // ID3v2 flags
      flags: {
        // Unsynchronisation
        unsynchronisation: util.getBit(buf, off + 5, 7),
        // Extended header
        isExtendedHeader: util.getBit(buf, off + 5, 6),
        // Experimental indicator
        expIndicator: util.getBit(buf, off + 5, 5),
        footer: util.getBit(buf, off + 5, 4)
      },
      size: UINT32SYNCSAFE.get(buf, off + 6)
    };
  }
};

export const ExtendedHeader: IGetToken<IExtendedHeader> = {
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
      crcDataPresent: util.getBit(buf, off + 4, 31)
    };
  }
};

export interface ITextEncoding {
  encoding: util.StringEncoding;
  bom?: boolean;
}

export const TextEncodingToken: IGetToken<ITextEncoding> = {
  len: 1,

  get: (buf: Buffer, off: number): ITextEncoding => {
    switch (buf.readUInt8(off)) {
      case 0x00:
        return {encoding: 'latin1'}; // binary
      case 0x01:
        return {encoding: 'utf16le', bom: true};
      case 0x02:
        return {encoding: 'utf16le', bom: false};
      case 0x03:
        return {encoding: 'utf8', bom: false};
      default:
        return {encoding: 'utf8', bom: false};

    }
  }
};
