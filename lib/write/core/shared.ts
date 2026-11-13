import { buildFlacUpdate } from '../flac/flac.js';
import { buildId3Update } from '../id3v2/id3v2.js';
import { buildMp4Update } from '../mp4/mp4.js';
import { buildOggUpdate } from '../ogg/ogg.js';
import { buildWavUpdate } from '../wav/wav.js';
import type { WriteChunk } from './chunks.js';
import { type ContainerFormat, detectFormat } from './detect.js';
import { InvalidPatchError, UnsupportedFeatureError, UnsupportedFormatError } from './errors.js';
import type { ByteSource } from './source.shared.js';
import type { TagPatch, WriteOptions, WriteResult } from './types.js';

export interface WriteUpdate {
  format: WriteResult['format'];
  chunks: WriteChunk[];
  paddingBytes: number;
  /** Stage on disk even for non-atomic file updates. */
  stageToFile?: boolean;
}

/**
 * Prepare one ordered chunk plan for file and buffer writers on both platforms.
 * Container builders retain responsibility for layout, validation and metadata.
 */
export async function buildUpdate(source: ByteSource, patch: TagPatch, options: WriteOptions): Promise<WriteUpdate> {
  const format = await detectFormat(source);
  assertSupported(format);
  switch (format) {
    case 'wav':
      return { format, ...(await buildWavUpdate(source, patch, options)) };
    case 'mp4':
      return { format, ...(await buildMp4Update(source, patch, options)), stageToFile: true };
    case 'ogg':
      return { format, ...(await buildOggUpdate(source, patch, options)), stageToFile: true };
  }
  if (format === 'flac' && options.replaceId3) {
    throw new UnsupportedFeatureError('replaceId3 is only supported for MP3, ADTS AAC and WAV');
  }
  const update =
    format === 'flac'
      ? { ...(await buildFlacUpdate(source, patch, options)), format: 'flac' as const }
      : await buildId3Update(source, patch, options);
  return {
    format: update.format,
    chunks: [update.metadata, { source, offset: update.audioOffset, length: update.audioLength }],
    paddingBytes: update.paddingBytes
  };
}

export function assertPatch(patch: TagPatch): void {
  if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
    throw new InvalidPatchError('patch must be an object');
  }
}

export function assertSupported(format: ContainerFormat): asserts format is Exclude<ContainerFormat, 'unknown'> {
  if (format === 'unknown') {
    throw new UnsupportedFormatError(
      'Unsupported audio format; supported formats are FLAC, Ogg Vorbis/Opus, WAV, MP4, MP3 and ADTS AAC (ID3v2.4)'
    );
  }
}
