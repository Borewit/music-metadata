/**
 * Browser-compatible metadata writing implementation, exported through the package root.
 */

import { writeBuffer } from './core/chunks.js';
import { assertPatch, buildUpdate } from './core/shared.js';
import { openSource } from './core/source.browser.js';
import type { TagPatch, WriteOptions } from './core/types.js';
import { normalizeCommonPatch } from './mapping/common.js';

export {
  InvalidFileError,
  InvalidPatchError,
  MetadataEditorError,
  UnsupportedFeatureError,
  UnsupportedFormatError,
  WriteError
} from './core/errors.js';
export type {
  Comment,
  CommonTags,
  LyricsEntry,
  LyricsPatch,
  NumberPair,
  NumberPairPatch,
  Picture,
  SynchronizedLyricsText,
  TagPatch,
  TextPatch,
  WriteOptions,
  WriteResult
} from './core/types.js';
export { PICTURE_TYPES } from './flac/picture.js';

/**
 * Update tags in an in-memory audio file (browser-compatible).
 *
 * Returns a new buffer; the input is not modified.
 * Accepts a Uint8Array or Blob as input.
 */
export async function updateBuffer(
  data: Uint8Array | Blob,
  patch: TagPatch,
  options: WriteOptions = {}
): Promise<Uint8Array> {
  assertPatch(patch);
  patch = normalizeCommonPatch(patch);
  const source = await openSource(data);
  try {
    const update = await buildUpdate(source, patch, options);
    return await writeBuffer(update.chunks);
  } finally {
    await source.close();
  }
}
