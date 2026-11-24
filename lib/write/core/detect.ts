import { detectMediaType, getId3v2HeaderLength } from '../../common/MediaFileType.js';
import type { ByteSource } from './source.shared.js';

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
    const header = await source.read(offset, Math.min(64, source.size - offset));
    if (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) {
      hasId3 = true;
      const length = getId3v2HeaderLength(header);
      if (length === undefined || length >= source.size - offset) {
        return 'id3'; // Let the ID3 writer validate incomplete or unsupported tags.
      }
      offset += length;
      continue;
    }
    const parserType = detectMediaType(header);
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
