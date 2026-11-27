import { detectImageType, detectMediaSignature, getFileTypeBoxSize } from '../../common/MediaFileType.js';
import { ID3v2Header } from '../../id3v2/ID3v2Token.js';
import type { ByteSource } from './source.shared.js';

// Limit how much of an ISO compatible-brand list writer selection reads.
const maxFileTypeBoxProbeLength = 4100;

export type ContainerFormat =
  | 'flac'
  | 'id3'
  | 'mp3'
  | 'aac'
  | 'wav'
  | 'mp4'
  | 'ogg'
  | 'ape'
  | 'wv'
  | 'mpc'
  | 'asf'
  | 'unknown';

/** Detect containers with bounded reads, without closing or borrowing the source tokenizer. */
export async function detectFormat(source: ByteSource): Promise<ContainerFormat> {
  let offset = 0;
  let hasId3 = false;
  while (offset < source.size) {
    const remaining = source.size - offset;
    let header = await source.read(offset, Math.min(16, remaining));
    const boxLength = Math.min(getFileTypeBoxSize(header), remaining, maxFileTypeBoxProbeLength);
    if (boxLength > header.length) {
      header = await source.read(offset, boxLength);
    }
    if (detectImageType(header)) {
      return 'unknown';
    }
    const parserType = detectMediaSignature(header);
    if (parserType === 'id3v2') {
      hasId3 = true;
      if (header.length < ID3v2Header.len || header.subarray(6, 10).some(byte => byte & 0x80)) {
        return 'id3';
      }
      const tag = ID3v2Header.get(header, 0);
      const footerLength = tag.version.major === 4 && tag.flags.footer ? ID3v2Header.len : 0;
      const length = ID3v2Header.len + tag.size + footerLength;
      if (tag.version.major < 2 || tag.version.major > 4 || length >= source.size - offset) {
        return 'id3'; // Let the ID3 writer validate incomplete or unsupported tags.
      }
      offset += length;
      continue;
    }
    switch (parserType) {
      case 'mpeg':
        return 'mp3';
      case 'adts':
        return 'aac';
      case 'riff':
        return 'wav';
      case 'apev2':
        return 'ape';
      case 'wavpack':
        return 'wv';
      case 'musepack':
        return 'mpc';
      case 'mp4':
      case 'flac':
      case 'ogg':
      case 'asf':
        return parserType;
      default:
        return hasId3 ? 'id3' : 'unknown';
    }
  }
  return 'unknown';
}
