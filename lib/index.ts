/**
 * Node.js specific entry point.
 */

import type { Readable } from 'node:stream';
import { fromStream, type IFileInfo } from 'strtok3';

import { getTokenizerOptions } from './common/Allocation.js';
import { parseFromTokenizer } from './core.js';
import type { IAudioMetadata, IOptions } from './type.js';

export * from './core.js';
export { parseFile } from './parseFile.js';
export { updateBuffer, updateFile } from './write/index.js';
export { MediaFile } from './write/MediaFile.js';

/**
 * Parse audio from Node Stream.Readable
 * @param stream - Stream to read the audio track from
 * @param fileInfo - File information object or MIME-type, e.g.: 'audio/mpeg'
 * @param options - Parsing options
 * @returns Metadata
 */
export async function parseStream(
  stream: Readable,
  fileInfo?: IFileInfo | string,
  options: IOptions = {}
): Promise<IAudioMetadata> {
  const tokenizer = await fromStream(
    stream,
    getTokenizerOptions(options, typeof fileInfo === 'string' ? { mimeType: fileInfo } : fileInfo)
  );
  try {
    return await parseFromTokenizer(tokenizer, options);
  } finally {
    await tokenizer.close();
  }
}
