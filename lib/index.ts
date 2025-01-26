/**
 * Node.js specific entry point.
 */

import type { Readable } from 'node:stream';
import { fromFile, fromStream, type IFileInfo } from 'strtok3';
import initDebug from 'debug';

import { parseFromTokenizer, } from './core.js';
import { ParserFactory } from './ParserFactory.js';
import type { IAudioMetadata, IOptions } from './type.js';

export * from './core.js';

const debug = initDebug('music-metadata:parser');

/**
 * Parse audio from Node Stream.Readable
 * @param stream - Stream to read the audio track from
 * @param fileInfo - File information object or MIME-type, e.g.: 'audio/mpeg'
 * @param options - Parsing options
 * @returns Metadata
 */
export async function parseStream(stream: Readable, fileInfo?: IFileInfo | string, options: IOptions = {}): Promise<IAudioMetadata> {
  const tokenizer = await fromStream(stream, {fileInfo: typeof fileInfo === 'string' ? {mimeType: fileInfo} : fileInfo});
  try {
    return await parseFromTokenizer(tokenizer, options);
  }
  finally {
    await tokenizer.close();
  }
}

/**
 * Parse audio from Node file
 * @param filePath - Media file to read meta-data from
 * @param options - Parsing options
 * @returns Metadata
 */
export async function parseFile(filePath: string, options: IOptions = {}): Promise<IAudioMetadata> {

  debug(`parseFile: ${filePath}`);

  const fileTokenizer = await fromFile(filePath);

  const parserFactory = new ParserFactory();

  try {
    const parserLoader = parserFactory.findLoaderForExtension(filePath);
    if (!parserLoader)
      debug(' Parser could not be determined by file extension');

    return await parserFactory.parse(fileTokenizer, parserLoader, options);
  } finally {
    await fileTokenizer.close();
  }
}
