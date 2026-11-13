/**
 * Node.js metadata writing implementation, exported through the package root.
 */

import { writeBuffer } from './core/chunks.js';
import { assertPatch, buildUpdate } from './core/shared.js';
import { openSource } from './core/source.js';
import type { TagPatch, WriteOptions, WriteResult } from './core/types.js';
import { writeChunks } from './core/writer.js';
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
 * Update tags in an audio file.
 *
 * The file is read with random access, the metadata section is rebuilt, and
 * the audio payload is copied in chunks. By default the result is written to a
 * temporary file and atomically renamed into place.
 */
export async function updateFile(filePath: string, patch: TagPatch, options: WriteOptions = {}): Promise<WriteResult> {
  assertPatch(patch);
  patch = normalizeCommonPatch(patch);
  const source = await openSource(filePath);
  try {
    const update = await buildUpdate(source, patch, options);
    const result = await writeChunks(filePath, update.chunks, {
      atomic: options.atomic ?? true,
      stageToFile: update.stageToFile,
      backup: options.backup ?? false,
      dryRun: options.dryRun ?? false,
      beforeReplace: () => source.close()
    });
    return { format: update.format, ...result, paddingBytes: update.paddingBytes };
  } finally {
    await source.close();
  }
}

/**
 * Update tags in an in-memory audio file.
 *
 * Returns a new buffer; the input is not modified.
 */
export async function updateBuffer(data: Uint8Array, patch: TagPatch, options: WriteOptions = {}): Promise<Uint8Array> {
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
