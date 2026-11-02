import { textDecode } from '@borewit/text-codec';
import type { IToken } from '@tokenizer/token';
import { UINT24_BE, UINT32_BE } from 'token-types';

import { attachedPictureType } from './id3v2.js';

/**
 * FLAC supports up to 128 kinds of metadata blocks; currently the following are defined:
 * Ref: https://xiph.org/flac/format.html#metadata_block
 */
export const BlockType = {
  STREAMINFO: 0,
  PADDING: 1,
  APPLICATION: 2,
  SEEKTABLE: 3,
  VORBIS_COMMENT: 4,
  CUESHEET: 5,
  PICTURE: 6
} as const;

export type BlockType = (typeof BlockType)[keyof typeof BlockType];

export interface IBlockHeader {
  /** Last-metadata-block flag: true for the last metadata block before the audio blocks. */
  lastBlock: boolean;
  /** Raw 7-bit block type code. Writers accept 0 through 126, including reserved codes. */
  type: number;
  /** Length in bytes of the metadata to follow, excluding this header. */
  length: number;
}

function ensureAvailable(
  buffer: Uint8Array,
  offset: number,
  length: number,
  createError: (message: string) => Error
): void {
  if (
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(length) ||
    offset < 0 ||
    length < 0 ||
    offset + length > buffer.length
  ) {
    throw createError(`Cannot read ${length} byte(s) at offset ${offset} from a ${buffer.length}-byte buffer`);
  }
}

const MAX_BLOCK_LENGTH = 0xffffff;

/**
 * FLAC METADATA_BLOCK_HEADER.
 * Ref: https://xiph.org/flac/format.html#metadata_block
 */
export const BlockHeader: IToken<IBlockHeader> = {
  len: 4,

  get(buffer: Uint8Array, offset: number): IBlockHeader {
    ensureAvailable(buffer, offset, BlockHeader.len, message => new RangeError(message));
    return {
      lastBlock: (buffer[offset] & 0x80) !== 0,
      type: buffer[offset] & 0x7f,
      length: UINT24_BE.get(buffer, offset + 1)
    };
  },

  put(buffer: Uint8Array, offset: number, value: IBlockHeader): number {
    ensureAvailable(buffer, offset, BlockHeader.len, message => new RangeError(message));
    if (!Number.isSafeInteger(value.length) || value.length < 0 || value.length > MAX_BLOCK_LENGTH) {
      throw new RangeError(`FLAC metadata block length must be between 0 and ${MAX_BLOCK_LENGTH}, got ${value.length}`);
    }
    if (!Number.isSafeInteger(value.type) || value.type < 0 || value.type > 126) {
      throw new RangeError(`FLAC metadata block type must be between 0 and 126, got ${value.type}`);
    }
    buffer[offset] = (value.lastBlock ? 0x80 : 0) | value.type;
    return UINT24_BE.put(buffer, offset + 1, value.length);
  }
};

/**
 * Picture types defined by the FLAC specification (and ID3v2 APIC).
 */
export const PICTURE_TYPES = [
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
] as const;

export function pictureTypeToNumber(type: string | undefined): number {
  if (type === undefined) {
    return 0;
  }
  const index = PICTURE_TYPES.indexOf(type as (typeof PICTURE_TYPES)[number]);
  return Math.max(index, 0);
}

export function normalizePictureMimeType(format: string): string {
  switch (format.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    default:
      return format;
  }
}

/**
 * FLAC PICTURE block, also used by the Vorbis `METADATA_BLOCK_PICTURE` field.
 *
 * Both the legacy `colour_depth` / `indexed_color` names and the writable
 * camelCase names are exposed, together with the numeric picture type.
 */
export interface IFlacPicture {
  typeId: number;
  type: string | undefined;
  format: string;
  description: string;
  width: number;
  height: number;
  colour_depth: number;
  indexed_color: number;
  colourDepth: number;
  colours: number;
  data: Uint8Array;
}

export interface PictureDecodeOptions {
  /** Error factory used for structural failures. Defaults to `RangeError`. */
  createError?: (message: string) => Error;
  /** Reject trailing bytes after the picture payload. */
  requireExactData?: boolean;
}

/**
 * Decode a FLAC PICTURE block body.
 *
 * The decoder validates every length before reading, so a forged length cannot
 * make it read outside the supplied buffer. It does not impose a policy limit
 * on the picture data itself; callers should bound the block before calling it.
 */
export function decodePicture(buffer: Uint8Array, offset = 0, options: PictureDecodeOptions = {}): IFlacPicture {
  const createError = options.createError ?? (message => new RangeError(message));
  ensureAvailable(buffer, offset, 32, createError);

  let cursor = offset;
  const typeId = UINT32_BE.get(buffer, cursor);
  cursor += 4;

  const formatLength = UINT32_BE.get(buffer, cursor);
  cursor += 4;
  ensureAvailable(buffer, cursor, formatLength, createError);
  const format = textDecode(buffer.subarray(cursor, cursor + formatLength), 'utf-8');
  cursor += formatLength;

  ensureAvailable(buffer, cursor, 4, createError);
  const descriptionLength = UINT32_BE.get(buffer, cursor);
  cursor += 4;
  ensureAvailable(buffer, cursor, descriptionLength, createError);
  const description = textDecode(buffer.subarray(cursor, cursor + descriptionLength), 'utf-8');
  cursor += descriptionLength;

  ensureAvailable(buffer, cursor, 20, createError);
  const width = UINT32_BE.get(buffer, cursor);
  cursor += 4;
  const height = UINT32_BE.get(buffer, cursor);
  cursor += 4;
  const colourDepth = UINT32_BE.get(buffer, cursor);
  cursor += 4;
  const colours = UINT32_BE.get(buffer, cursor);
  cursor += 4;
  const dataLength = UINT32_BE.get(buffer, cursor);
  cursor += 4;

  ensureAvailable(buffer, cursor, dataLength, createError);
  const data = new Uint8Array(buffer.subarray(cursor, cursor + dataLength));
  cursor += dataLength;

  if (options.requireExactData && cursor !== buffer.length) {
    throw createError(`FLAC PICTURE has ${buffer.length - cursor} trailing byte(s)`);
  }

  return {
    typeId,
    type: attachedPictureType(typeId),
    format,
    description,
    width,
    height,
    colour_depth: colourDepth,
    indexed_color: colours,
    colourDepth,
    colours,
    data
  };
}
