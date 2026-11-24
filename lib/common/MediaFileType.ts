import type { ParserType } from '../type.js';

/** Keep stream lookahead bounded, including when an ID3 tag precedes the container. */
export const mediaTypeProbeLength = 4100;

function matches(data: Uint8Array, signature: string | readonly number[], offset = 0): boolean {
  if (offset + signature.length > data.length) {
    return false;
  }
  for (let index = 0; index < signature.length; ++index) {
    const byte = typeof signature === 'string' ? signature.charCodeAt(index) : signature[index];
    if (data[offset + index] !== byte) {
      return false;
    }
  }
  return true;
}

/** Includes the header and optional v2.4 footer; never trusts non-synchsafe sizes. */
export function getId3v2HeaderLength(data: Uint8Array): number | undefined {
  if (!matches(data, 'ID3') || data.length < 10 || data[3] < 2 || data[3] > 4) {
    return;
  }
  if ((data[6] | data[7] | data[8] | data[9]) & 0x80) {
    return;
  }
  const size = data[6] * 0x200000 + data[7] * 0x4000 + data[8] * 0x80 + data[9];
  return 10 + size + (data[3] === 4 && (data[5] & 0x10) !== 0 ? 10 : 0);
}

/** Inspect existing bytes only: no payload copies, decompression, or size-driven allocations. */
export function detectImageType(data: Uint8Array): string | undefined {
  if (matches(data, [0xff, 0xd8, 0xff])) {
    return 'image/jpeg';
  }
  if (matches(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }
  if (matches(data, 'GIF87a') || matches(data, 'GIF89a')) {
    return 'image/gif';
  }
  if (matches(data, 'RIFF') && matches(data, 'WEBP', 8)) {
    return 'image/webp';
  }
  if (matches(data, 'BM')) {
    return 'image/bmp';
  }
  if (matches(data, [0x49, 0x49, 0x2a, 0]) || matches(data, [0x4d, 0x4d, 0, 0x2a])) {
    return 'image/tiff';
  }
  if (matches(data, 'ftyp', 4)) {
    if (matches(data, 'avif', 8) || matches(data, 'avis', 8)) {
      return 'image/avif';
    }
    const boxSize = data[0] * 0x1000000 + data[1] * 0x10000 + data[2] * 0x100 + data[3];
    const end = Math.min(boxSize, data.length);
    // Skip major_brand and minor_version; inspect only complete compatible_brands entries.
    for (let offset = 16; offset + 4 <= end; offset += 4) {
      if (matches(data, 'avif', offset) || matches(data, 'avis', offset)) {
        return 'image/avif';
      }
    }
  }
}

/** Detect parser families rather than codecs; the selected parser validates the complete container. */
export function detectMediaType(data: Uint8Array): ParserType | undefined {
  let hasId3 = false;
  while (matches(data, 'ID3')) {
    hasId3 = true;
    const length = getId3v2HeaderLength(data);
    if (length === undefined || length >= data.length) {
      return 'mpeg';
    }
    data = data.subarray(length);
  }

  // Check images first: AVIF shares the ISO base media container with MP4.
  if (detectImageType(data)) {
    return;
  }
  if (matches(data, 'fLaC')) {
    return 'flac';
  }
  if (matches(data, 'OggS')) {
    return 'ogg';
  }
  if (matches(data, 'RIFF') && matches(data, 'WAVE', 8)) {
    return 'riff';
  }
  if (matches(data, 'FORM') && (matches(data, 'AIFF', 8) || matches(data, 'AIFC', 8))) {
    return 'aiff';
  }
  if (matches(data, 'MAC ')) {
    return 'apev2';
  }
  if (matches(data, 'wvpk')) {
    return 'wavpack';
  }
  if (matches(data, 'MPCK') || matches(data, 'MP+')) {
    return 'musepack';
  }
  if (matches(data, 'DSD ')) {
    return 'dsf';
  }
  if (matches(data, 'FRM8') && matches(data, 'DSD ', 12)) {
    return 'dsdiff';
  }
  if (matches(data, 'caff')) {
    return 'caf';
  }
  if (matches(data, [0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0, 0xaa, 0, 0x62, 0xce, 0x6c])) {
    return 'asf';
  }
  if (matches(data, [0x1a, 0x45, 0xdf, 0xa3])) {
    return 'matroska';
  }
  if (data.length >= 12 && matches(data, 'ftyp', 4)) {
    // Unsupported HEIF artwork must not be routed to an audio/video parser or writer.
    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].some(brand => matches(data, brand, 8))) {
      return;
    }
    return 'mp4';
  }
  // Older QuickTime files need not contain an ftyp atom.
  if (data.length >= 8 && ['moov', 'mdat', 'wide', 'free', 'skip'].some(atom => matches(data, atom, 4))) {
    return 'mp4';
  }
  // Permit up to ten leading junk bytes, as the reader historically did.
  for (let offset = 0; offset <= 10 && offset + 4 <= data.length; ++offset) {
    if (data[offset] !== 0xff) {
      continue;
    }
    const second = data[offset + 1];
    const third = data[offset + 2];
    if ((second & 0xf6) === 0xf0 && (third & 0x3c) < 0x34) {
      return 'adts';
    }
    if (
      (second & 0xe0) === 0xe0 &&
      (second & 0x18) !== 0x08 &&
      (second & 0x06) !== 0 &&
      (third & 0xf0) !== 0xf0 &&
      (third & 0x0c) !== 0x0c
    ) {
      return 'mpeg';
    }
  }
  if (hasId3) {
    return 'mpeg';
  }
}
