import * as Token from 'token-types';
import type { IGetToken } from 'strtok3';

import * as util from '../common/Util.js';

/**
 * The picture type according to the ID3v2 APIC frame
 * Ref: http://id3.org/id3v2.3.0#Attached_picture
 */
export const AttachedPictureType = {
  0: 'Other',
  1: "32x32 pixels 'file icon' (PNG only)",
  2: 'Other file icon',
  3: 'Cover (front)',
  4: 'Cover (back)',
  5: 'Leaflet page',
  6: 'Media (e.g. label side of CD)',
  7: 'Lead artist/lead performer/soloist',
  8: 'Artist/performer',
  9: 'Conductor',
  10: 'Band/Orchestra',
  11: 'Composer',
  12: 'Lyricist/text writer',
  13: 'Recording Location',
  14: 'During recording',
  15: 'During performance',
  16: 'Movie/video screen capture',
  17: 'A bright coloured fish',
  18: 'Illustration',
  19: 'Band/artist logotype',
  20: 'Publisher/Studio logotype'
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
 * https://id3.org/id3v2.3.0#Synchronised_lyrics.2Ftext
 */
export const LyricsContentType = {
  other: 0,
  lyrics: 1,
  text: 2,
  movement_part: 3,
  events: 4,
  chord: 5,
  trivia_pop: 6,
};
export type LyricsContentType = typeof LyricsContentType[keyof typeof LyricsContentType];

export const TimestampFormat = {
  notSynchronized0: 0,
  mpegFrameNumber: 1,
  milliseconds: 2
};
export type TimestampFormat = typeof TimestampFormat[keyof typeof TimestampFormat];

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

  get: (buf: Uint8Array, off): IID3v2header => {
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

  get: (uint8Array: Uint8Array, off: number): ITextEncoding => {
    switch (uint8Array[off]) {
      case 0x00:
        return {encoding: 'latin1'}; // binary
      case 0x01:
        return {encoding: 'utf-16le', bom: true};
      case 0x02:
        return {encoding: 'utf-16le', bom: false};
      case 0x03:
        return {encoding: 'utf8', bom: false};
      default:
        return {encoding: 'utf8', bom: false};

    }
  }
};

/**
 * `USLT` frame fields
 */
export interface ITextHeader {
  encoding: ITextEncoding;
  language: string;
}

/**
 * Used to read first portion of `SYLT` frame
 */
export const TextHeader: IGetToken<ITextHeader> = {
  len: 4,

  get: (uint8Array: Uint8Array, off: number): ITextHeader => {
    return {
      encoding: TextEncodingToken.get(uint8Array, off),
      language: new Token.StringType(3, 'latin1').get(uint8Array, off + 1)
    };
  }
};

/**
 * SYLT` frame fields
 */
export interface ISyncTextHeader extends ITextHeader {
  contentType: LyricsContentType;
  timeStampFormat: TimestampFormat;
}

/**
 * Used to read first portion of `SYLT` frame
 */
export const SyncTextHeader: IGetToken<ISyncTextHeader> = {
  len: 6,

  get: (uint8Array: Uint8Array, off: number): ISyncTextHeader => {
    const text = TextHeader.get(uint8Array, off);
    return {
      encoding: text.encoding,
      language: text.language,
      timeStampFormat: Token.UINT8.get(uint8Array, off + 4),
      contentType: Token.UINT8.get(uint8Array, off + 5)
    };
  }
};
