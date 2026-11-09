import { textEncode } from '@borewit/text-codec';
import { TokenWriter } from 'strtok3';
import { UINT32_LE } from 'token-types';
import type { VorbisFields } from '../../tokens/vorbis.js';
import { InvalidPatchError } from '../core/errors.js';

// Shared with both parser paths so successful writes remain re-editable.
export const MAX_COMMENTS = 1_000_000;

const MAX_UINT32 = 0xffffffff;

function assertLength(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_UINT32) {
    throw new RangeError(`${label} must be between 0 and ${MAX_UINT32}, got ${value}`);
  }
}

/**
 * Serialize a complete Vorbis Comment metadata block body.
 *
 * Keys are written exactly as supplied, so callers can preserve the original
 * spelling of unknown fields.
 */
export function serializeVorbisComment(fields: VorbisFields): Uint8Array {
  if (fields.comments.length > MAX_COMMENTS) {
    throw new InvalidPatchError(`Vorbis comment count ${fields.comments.length} exceeds entry limit ${MAX_COMMENTS}`);
  }
  const vendor = textEncode(fields.vendor, 'utf-8');
  assertLength(vendor.length, 'Vorbis vendor length');
  assertLength(fields.comments.length, 'Vorbis comment count');

  const comments = fields.comments.map(comment => {
    const value = textEncode(`${comment.key}=${comment.value}`, 'utf-8');
    assertLength(value.length, `Vorbis comment '${comment.key}' length`);
    return value;
  });

  let size = 4 + vendor.length + 4;
  for (const comment of comments) {
    size += 4 + comment.length;
  }

  const writer = new TokenWriter(size);

  writer.writeToken(UINT32_LE, vendor.length);
  writer.writeBuffer(vendor);

  writer.writeToken(UINT32_LE, comments.length);
  for (const comment of comments) {
    writer.writeToken(UINT32_LE, comment.length);
    writer.writeBuffer(comment);
  }

  return writer.toUint8Array();
}
