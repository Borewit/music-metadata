import type { VorbisFields } from '../../tokens/vorbis.js';
import { InvalidFileError } from '../core/errors.js';
import { MAX_COMMENTS } from './write.js';

export type { VorbisComment, VorbisFields } from '../../tokens/vorbis.js';
export { serializeVorbisComment } from './write.js';

export interface ParsedVorbisCommentWithSuffix extends VorbisFields {
  /** Bytes following the comment list, such as Vorbis framing/padding or an OpusTags suffix. */
  suffix: Uint8Array;
}

export function parseVorbisComment(data: Uint8Array): VorbisFields {
  return parseShared(data, {
    maxComments: MAX_COMMENTS,
    createError: message => new InvalidFileError(message)
  });
}

/**
 * Parse a Vorbis Comment block that may be followed by format-specific data.
 *
 * Vorbis has a framing bit and optional padding; OpusTags permits an
 * optional binary suffix (RFC 7845 §5.2). The shared parser rejects such
 * trailing data, so locate the end of the comment list before validating
 * the block itself.
 */
export function parseVorbisCommentWithSuffix(data: Uint8Array): ParsedVorbisCommentWithSuffix {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 0;

  const readLength = (label: string): number => {
    if (offset + 4 > data.length) {
      throw new InvalidFileError(`Truncated Vorbis comment ${label} length`);
    }
    const length = view.getUint32(offset, true);
    offset += 4;
    if (length > data.length - offset) {
      throw new InvalidFileError(
        `Vorbis comment ${label} length ${length} exceeds remaining data ${data.length - offset}`
      );
    }
    return length;
  };

  const vendorLength = readLength('vendor');
  offset += vendorLength;
  const count = readLength('comment count');
  if (count > MAX_COMMENTS) {
    throw new InvalidFileError(`Vorbis comment count ${count} exceeds entry limit ${MAX_COMMENTS}`);
  }
  if (count > Math.floor((data.length - offset) / 4)) {
    throw new InvalidFileError(`Vorbis comment count ${count} exceeds remaining data`);
  }
  for (let index = 0; index < count; index++) {
    const length = readLength(`entry ${index}`);
    offset += length;
  }

  const fields = parseShared(data.subarray(0, offset), {
    maxComments: MAX_COMMENTS,
    createError: message => new InvalidFileError(message)
  });
  return { ...fields, suffix: data.subarray(offset) };
}

function parseShared(
  data: Uint8Array,
  options: { maxComments: number; createError: (message: string) => Error }
): import('../../tokens/vorbis.js').VorbisFields {
  return parseVorbisCommentFromTokens(data, options);
}

import { parseVorbisComment as parseVorbisCommentFromTokens } from '../../tokens/vorbis.js';
