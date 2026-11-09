/**
 * Node.js metadata writing implementation, exported through the package root.
 */

import { concatBytes } from './core/bytes.js';
import { detectFormat } from './core/detect.js';
import { UnsupportedFeatureError } from './core/errors.js';
import { assertPatch, assertSupported, buildStreamedUpdate } from './core/shared.js';
import { openSource } from './core/source.js';
import type { TagPatch, WriteOptions, WriteResult } from './core/types.js';
import { writeChunks } from './core/writer.js';
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
    const format = await detectFormat(source);
    assertSupported(format);
    if (format === 'flac' && options.replaceId3) {
      throw new UnsupportedFeatureError('replaceId3 is only supported for MP3 and WAV');
    }

    if (format === 'wav' || format === 'mp4' || format === 'ogg') {
      const update = await buildStreamedUpdate(format, source, patch, options);
      const result = await writeChunks(filePath, update.chunks, {
        atomic: options.atomic ?? true,
        stageToFile: format === 'mp4' || format === 'ogg',
        backup: options.backup ?? false,
        dryRun: options.dryRun ?? false,
        beforeReplace: () => source.close()
      });
      return { format, ...result, paddingBytes: update.paddingBytes };
    }
    const update = await (format === 'flac' ? buildFlacUpdate : buildId3Update)(source, patch, options);
    const result = await writeChunks(
      filePath,
      [update.metadata, { source, offset: update.audioOffset, length: update.audioLength }],
      {
        atomic: options.atomic ?? true,
        backup: options.backup ?? false,
        dryRun: options.dryRun ?? false,
        beforeReplace: () => source.close()
      }
    );

    return {
      format: format === 'flac' ? 'flac' : 'mp3',
      bytesWritten: result.bytesWritten,
      paddingBytes: update.paddingBytes,
      atomic: result.atomic
    };
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
    const format = await detectFormat(source);
    assertSupported(format);
    if (format === 'flac' && options.replaceId3) {
      throw new UnsupportedFeatureError('replaceId3 is only supported for MP3 and WAV');
    }

    if (format === 'wav' || format === 'mp4' || format === 'ogg') {
      const update = await buildStreamedUpdate(format, source, patch, options);
      const output = new Uint8Array(update.chunks.reduce((sum, chunk) => sum + chunk.length, 0));
      let offset = 0;
      for (const chunk of update.chunks) {
        const bytes = chunk instanceof Uint8Array ? chunk : await chunk.source.read(chunk.offset, chunk.length);
        output.set(bytes, offset);
        offset += bytes.length;
      }
      return output;
    }
    const update = await (format === 'flac' ? buildFlacUpdate : buildId3Update)(source, patch, options);
    const audio = await source.read(update.audioOffset, update.audioLength);
    return concatBytes(update.metadata, audio);
  } finally {
    await source.close();
  }
}
