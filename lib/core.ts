/**
 * Primary entry point, Node.js specific entry point is MusepackParser.ts
 */

import { type AnyWebByteStream, type IFileInfo, type ITokenizer, fromWebStream, fromBuffer, type IRandomAccessTokenizer, fromBlob } from 'strtok3';

import { ParserFactory } from './ParserFactory.js';
import { APEv2Parser } from './apev2/APEv2Parser.js';
import { hasID3v1Header } from './id3v1/ID3v1Parser.js';
import { getLyricsHeaderLength } from './lyrics3/Lyrics3.js';

import type { IAudioMetadata, INativeTagDict, IOptions, IPicture, IPrivateOptions, ITag } from './type.js';
import type { Readable } from 'node:stream';

export type { IFileInfo } from 'strtok3';

export { type IAudioMetadata, type IOptions, type ITag, type INativeTagDict, type ICommonTagsResult, type IFormat, type IPicture, type IRatio, type IChapter, type ILyricsTag, LyricsContentType, TimestampFormat, IMetadataEventTag, IMetadataEvent } from './type.js';
export { CouldNotDetermineFileTypeError, UnsupportedFileTypeError } from './ParseError.js';

export * from './ParseError.js'

/**
 * Parse Web API File
 * Requires Blob to be able to stream using a ReadableStreamBYOBReader, only available since Node.js ≥ 20
 * @param blob - Blob to parse
 * @param options - Parsing options
 * @returns Metadata
 */
export async function parseBlob(blob: Blob, options: IOptions = {}): Promise<IAudioMetadata> {
  const tokenizer = fromBlob(blob);
  try {
    return await parseFromTokenizer(tokenizer, options);
  } finally {
    await tokenizer.close();
  }
}

/**
 * Parse audio from Web Stream.Readable
 * @param webStream - WebStream to read the audio track from
 * @param options - Parsing options
 * @param fileInfo - File information object or MIME-type string
 * @returns Metadata
 */
export async function parseWebStream(webStream: AnyWebByteStream, fileInfo?: IFileInfo | string, options: IOptions = {}): Promise<IAudioMetadata> {
  const tokenizer = fromWebStream(webStream, {fileInfo: typeof fileInfo === 'string' ? {mimeType: fileInfo} : fileInfo});
  try {
    return await parseFromTokenizer(tokenizer, options);
  } finally {
    await tokenizer.close();
  }
}

/**
 * Parse audio from memory
 * @param uint8Array - Uint8Array holding audio data
 * @param fileInfo - File information object or MIME-type string
 * @param options - Parsing options
 * @returns Metadata
 * Ref: https://github.com/Borewit/strtok3/blob/e6938c81ff685074d5eb3064a11c0b03ca934c1d/src/index.ts#L15
 */
export async function parseBuffer(uint8Array: Uint8Array, fileInfo?: IFileInfo | string, options: IOptions = {}): Promise<IAudioMetadata> {

  const tokenizer = fromBuffer(uint8Array, {fileInfo: typeof fileInfo === 'string' ? {mimeType: fileInfo} : fileInfo});
  return parseFromTokenizer(tokenizer, options);
}

/**
 * Parse audio from ITokenizer source
 * @param tokenizer - Audio source implementing the tokenizer interface
 * @param options - Parsing options
 * @returns Metadata
 */
export function parseFromTokenizer(tokenizer: ITokenizer, options?: IOptions): Promise<IAudioMetadata> {
  const parserFactory = new ParserFactory();
  return parserFactory.parse(tokenizer, undefined, options)
}

/**
 * Create a dictionary ordered by their tag id (key)
 * @param nativeTags list of tags
 * @returns tags indexed by id
 */
export function orderTags(nativeTags: ITag[]): INativeTagDict {
  const tags: INativeTagDict = {};

  for (const { id, value } of nativeTags) {
    (tags[id] ||= []).push(value);
  }

  return tags;
}

/**
 * Convert rating to 1-5 star rating
 * @param rating Normalized rating [0..1] (common.rating[n].rating)
 * @returns Number of stars: 1, 2, 3, 4 or 5 stars
 */
export function ratingToStars(rating: number | undefined): number {
  return rating === undefined ? 0 : 1 + Math.round(rating * 4);
}

/**
 * Select most likely cover image.
 * @param pictures Usually metadata.common.picture
 * @return Cover image, if any, otherwise null
 */
export function selectCover(pictures?: IPicture[]): IPicture | null {
  return pictures ? pictures.reduce((acc, cur) => {
    if (cur.name && cur.name.toLowerCase() in ['front', 'cover', 'cover (front)'])
      return cur;
    return acc;
  }) : null;
}

export async function scanAppendingHeaders(tokenizer: IRandomAccessTokenizer, options: IPrivateOptions = {}) {

  let apeOffset = tokenizer.fileInfo.size;
  if (await hasID3v1Header(tokenizer)) {
    apeOffset -= 128;
    const lyricsLen = await getLyricsHeaderLength(tokenizer);
    apeOffset -= lyricsLen;
  }

  options.apeHeader = await APEv2Parser.findApeFooterOffset(tokenizer, apeOffset);
}

/**
 * Implementation only available when loaded as Node.js
 * This method will throw an Error, always.
 */
export async function parseFile(_filePath: string, _options: IOptions = {}): Promise<IAudioMetadata> {
  throw new Error('This function require a Node engine. To load Web API File objects use parseBlob instead.');
}

/**
 * Implementation only available when loaded as Node.js
 * This method will throw an Error, always.
 */
export async function parseStream(_stream: Readable, _fileInfo?: IFileInfo | string, _options: IOptions = {}): Promise<IAudioMetadata> {
  throw new Error('This function require a Node engine.');
}

/**
 * Return a list of supported mime-types
 */
export function getSupportedMimeTypes(): string[] {
  return new ParserFactory().getSupportedMimeTypes();
}
