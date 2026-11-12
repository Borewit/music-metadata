import { buildMp4Update } from '../mp4/mp4.js';
import { buildOggUpdate } from '../ogg/ogg.js';
import { buildWavUpdate } from '../wav/wav.js';
import type { ContainerFormat } from './detect.js';
import { InvalidPatchError, UnsupportedFormatError } from './errors.js';
import type { ByteSource } from './source.js';
import type { TagPatch, WriteOptions } from './types.js';
import type { WriteChunk } from './writer.js';

/**
 * Rebuild a container whose metadata and audio are written as ordered chunks.
 */
export function buildStreamedUpdate(
  format: 'wav' | 'mp4' | 'ogg',
  source: ByteSource,
  patch: TagPatch,
  options: WriteOptions
): Promise<{ chunks: WriteChunk[]; paddingBytes: number }> {
  switch (format) {
    case 'wav':
      return buildWavUpdate(source, patch, options);
    case 'mp4':
      return buildMp4Update(source, patch, options);
    case 'ogg':
      return buildOggUpdate(source, patch, options);
  }
}

export function assertPatch(patch: TagPatch): void {
  if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
    throw new InvalidPatchError('patch must be an object');
  }
}

export function assertSupported(
  format: ContainerFormat
): asserts format is 'flac' | 'id3' | 'mp3' | 'aac' | 'wav' | 'mp4' | 'ogg' {
  if (format === 'unknown') {
    throw new UnsupportedFormatError(
      'Unsupported audio format; supported formats are FLAC, Ogg Vorbis/Opus, WAV, MP4, MP3 and ADTS AAC (ID3v2.4)'
    );
  }
}
