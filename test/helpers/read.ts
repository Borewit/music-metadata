import { type IAudioMetadata, type IPicture, parseBuffer, parseFile } from '../../lib/index.js';

import { detectFormat } from '../../lib/write/core/detect.js';
import { openSource } from '../../lib/write/core/source.js';

export interface ReadResult {
  /** Container format, lower-cased, e.g. `flac` or `mp4`. */
  format: string;
  common: IAudioMetadata['common'];
  native: IAudioMetadata['native'];
  pictures: IPicture[];
  quality: IAudioMetadata['quality'];
}

function inferFormat(metadata: IAudioMetadata): string {
  const container = metadata.format.container?.toLowerCase();
  if (container === undefined) {
    return 'unknown';
  }
  if (/^(m4a|m4b|mp4|isom|iso2|mp42)(\/|$)/.test(container)) {
    return 'mp4';
  }
  if (container.includes('flac')) {
    return 'flac';
  }
  if (container === 'mpeg' || container.includes('mpeg') || container === 'mp3') {
    return 'mp3';
  }
  return container;
}

/**
 * Read tags using `music-metadata` directly.
 *
 * music-metadata-editor is write-only; tests use this helper (backed by
 * `music-metadata`) to verify write results. It mirrors the editor's former
 * `readTags` format detection so `format` strings stay identical.
 */
export async function readTags(input: string | Uint8Array): Promise<ReadResult> {
  const source = await openSource(input);
  try {
    const format = await detectFormat(source);
    const metadata = await (typeof input === 'string'
      ? parseFile(input)
      : format === 'flac'
        ? parseBuffer(input, { mimeType: 'audio/flac' })
        : parseBuffer(input));
    return {
      format: format === 'mp4' ? 'mp4' : inferFormat(metadata),
      common: metadata.common,
      native: metadata.native,
      pictures: metadata.common.picture ? [...metadata.common.picture] : [],
      quality: metadata.quality
    };
  } finally {
    await source.close();
  }
}
