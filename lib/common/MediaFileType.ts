import { BufferSizeError, type ITokenizer } from 'strtok3';
import { UnsupportedFileTypeError } from '../ParseError.js';
import type { ParserType } from '../type.js';

/** ASF and DSDIFF have the longest fixed signatures. */
const mediaTypeProbeLength = 16;

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

export const apeTagPreamble = 'APETAGEX';

export function getFileTypeBoxSize(data: Uint8Array): number {
  return matches(data, 'ftyp', 4) ? data[0] * 0x1000000 + data[1] * 0x10000 + data[2] * 0x100 + data[3] : 0;
}

function detectFixedImageSignature(data: Uint8Array): string | undefined {
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
}

/** Inspect existing artwork bytes, including the compatible brands in an ISO file-type box. */
export function detectImageType(data: Uint8Array): string | undefined {
  if (matches(data, 'ftyp', 4)) {
    if (matches(data, 'avif', 8) || matches(data, 'avis', 8)) {
      return 'image/avif';
    }
    const end = Math.min(getFileTypeBoxSize(data), data.length);
    // Skip major_brand and minor_version; inspect only complete compatible_brands entries.
    for (let offset = 16; offset + 4 <= end; offset += 4) {
      if (matches(data, 'avif', offset) || matches(data, 'avis', offset)) {
        return 'image/avif';
      }
    }
  }
  return detectFixedImageSignature(data);
}

const isoBoxTypes = ['ftyp', 'moov', 'mdat', 'wide', 'free', 'skip', 'styp', 'uuid'];

/** Consume only the zero fill between a completed ID3v2 tag and the next header. */
export async function skipPostId3Zeros(tokenizer: ITokenizer): Promise<void> {
  let probe = new Uint8Array(2048);
  while (true) {
    let length: number;
    try {
      length = await tokenizer.peekBuffer(probe, { mayBeLess: true });
    } catch (error) {
      // Stream tokenizers can impose a smaller hard limit on a single peek.
      if (!(error instanceof BufferSizeError) || error.maxBufferSize >= probe.length) {
        throw error;
      }
      probe = probe.subarray(0, error.maxBufferSize);
      continue;
    }
    if (length === 0 || probe[0] !== 0) {
      return;
    }
    const header = probe.subarray(0, length);
    const firstNonzero = header.findIndex(byte => byte !== 0);
    await tokenizer.ignore(firstNonzero < 0 ? length : firstNonzero);
    if (firstNonzero >= 0) {
      return;
    }
  }
}

/** Peek at the current signature. A null result means end of input. */
export async function detectMediaType(
  tokenizer: ITokenizer,
  maxBufferSize: number
): Promise<{ type?: ParserType; fallbackType?: ParserType } | null> {
  const probe = new Uint8Array(Math.min(mediaTypeProbeLength, maxBufferSize));
  const length = await tokenizer.peekBuffer(probe, { mayBeLess: true });
  if (length === 0) {
    return null;
  }
  const header = probe.subarray(0, length);
  const type = detectMediaSignature(header, 0);
  if (type) {
    return { type };
  }
  const mimeType = detectImageType(header);
  if (mimeType) {
    throw new UnsupportedFileTypeError(`Guessed MIME-type not supported: ${mimeType}`);
  }
  // A frame after leading junk is weaker evidence than a caller-supplied format hint.
  return { fallbackType: detectMediaSignature(header) };
}

/** Detect parser families rather than codecs; the selected parser validates the complete container. */
export function detectMediaSignature(data: Uint8Array, maxLeadingJunkBytes = 10): ParserType | undefined {
  if (matches(data, 'ID3')) {
    return 'id3v2';
  }
  if (matches(data, apeTagPreamble)) {
    return 'ape-tag';
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
  if (matches(data, 'ftyp', 4)) {
    if (data.length < 12) {
      return;
    }
    // Unsupported HEIF artwork must not be routed to an audio/video parser or writer.
    if (['avif', 'avis', 'heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].some(brand => matches(data, brand, 8))) {
      return;
    }
    return 'mp4';
  }
  // Older QuickTime files need not contain an ftyp atom.
  if (data.length >= 8 && isoBoxTypes.some(atom => matches(data, atom, 4))) {
    return 'mp4';
  }
  // Permit up to ten leading junk bytes, as the reader historically did.
  for (let offset = 0; offset <= maxLeadingJunkBytes && offset + 4 <= data.length; ++offset) {
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
}
