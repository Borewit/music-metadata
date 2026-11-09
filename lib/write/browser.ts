/**
 * Browser-compatible metadata writing implementation, exported through the package root.
 */

import { concatBytes } from './core/bytes.js';
import { detectFormat } from './core/detect.js';
import { UnsupportedFeatureError } from './core/errors.js';
import { assertPatch, assertSupported, buildStreamedUpdate } from './core/shared.js';
import { openSource } from './core/source.browser.js';
import type { TagPatch, WriteOptions } from './core/types.js';
import { writeBuffer } from './core/writer.browser.js';
import { buildFlacUpdate } from './flac/flac.js';
import { buildId3Update } from './id3v2/id3v2.js';
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
    const format = await detectFormat(source);
    assertSupported(format);
    if (format === 'flac' && options.replaceId3) {
      throw new UnsupportedFeatureError('replaceId3 is only supported for MP3 and WAV');
    }

    if (format === 'wav' || format === 'mp4' || format === 'ogg') {
      const update = await buildStreamedUpdate(format, source, patch, options);
      return writeBuffer(update.chunks);
    }
    const update = await (format === 'flac' ? buildFlacUpdate : buildId3Update)(source, patch, options);
    const audio = await source.read(update.audioOffset, update.audioLength);
    return concatBytes(update.metadata, audio);
  } finally {
    await source.close();
  }
}
