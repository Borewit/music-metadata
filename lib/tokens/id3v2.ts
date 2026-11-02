import type { IToken } from '@tokenizer/token';

/**
 * The picture type according to the ID3v2 APIC frame.
 * Ref: https://id3.org/id3v2.3.0#Attached_picture
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
} as const;

export type AttachedPictureTypeId = keyof typeof AttachedPictureType;

const attachedPictureTypes: Readonly<Record<number, string>> = AttachedPictureType;

export function attachedPictureType(typeId: number): string | undefined {
  return attachedPictureTypes[typeId];
}

function ensureAvailable(buffer: Uint8Array, offset: number, length: number): void {
  if (
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(length) ||
    offset < 0 ||
    length < 0 ||
    offset + length > buffer.length
  ) {
    throw new RangeError(`Cannot read ${length} byte(s) at offset ${offset} from a ${buffer.length}-byte buffer`);
  }
}

/**
 * 28-bit (representing up to 256 MB) integer, with the most significant bit of
 * each byte cleared to avoid false sync signals: 4 * %0xxxxxxx
 */
export const UINT32SYNCSAFE: IToken<number> = {
  len: 4,

  get(buffer: Uint8Array, offset: number): number {
    ensureAvailable(buffer, offset, UINT32SYNCSAFE.len);
    return (
      (buffer[offset + 3] & 0x7f) | (buffer[offset + 2] << 7) | (buffer[offset + 1] << 14) | (buffer[offset] << 21)
    );
  },

  put(buffer: Uint8Array, offset: number, value: number): number {
    ensureAvailable(buffer, offset, UINT32SYNCSAFE.len);
    if (!Number.isSafeInteger(value) || value < 0 || value > 0x0fffffff) {
      throw new RangeError(`Sync-safe integer must be between 0 and ${0x0fffffff}, got ${value}`);
    }
    buffer[offset] = (value >>> 21) & 0x7f;
    buffer[offset + 1] = (value >>> 14) & 0x7f;
    buffer[offset + 2] = (value >>> 7) & 0x7f;
    buffer[offset + 3] = value & 0x7f;
    return offset + UINT32SYNCSAFE.len;
  }
};
