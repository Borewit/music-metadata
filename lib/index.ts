/**
 * Node.js specific entry point.
 */

import type { Readable } from 'node:stream';
import { fromFile, fromStream, type IFileInfo } from 'strtok3';
import initDebug from 'debug';

import { parseFromTokenizer, scanAppendingHeaders } from './core.js';
import { getParserIdForExtension, parse } from './ParserFactory.js';
import type { IAudioMetadata, IOptions } from './type.js';
import { RandomFileReader } from './common/RandomFileReader.js';

export { IAudioMetadata, IOptions, ITag, INativeTagDict, ICommonTagsResult, IFormat, IPicture, IRatio, IChapter, ILyricsTag, LyricsContentType, TimestampFormat } from './type.js';
export { parseFromTokenizer, parseBuffer, parseBlob, parseWebStream, selectCover, orderTags, ratingToStars, IFileInfo } from './core.js';

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
  return parseFromTokenizer(tokenizer, options);
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

  const fileReader = await RandomFileReader.init(filePath, fileTokenizer.fileInfo.size);
  try {
    await scanAppendingHeaders(fileReader, options);
  } finally {
    await fileReader.close();
  }

  try {
    const parserName = getParserIdForExtension(filePath);
    if (!parserName)
      debug(' Parser could not be determined by file extension');

    return await parse(fileTokenizer, parserName, options);
  } finally {
    await fileTokenizer.close();
  }
}
