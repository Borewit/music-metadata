/**
 * Primary entry point, Node.js specific entry point is index.ts
 */

import {type AnyWebByteStream, type IFileInfo, type ITokenizer, fromWebStream, fromBuffer} from 'strtok3';

import { parseOnContentType } from './ParserFactory.js';
import { RandomUint8ArrayReader } from './common/RandomUint8ArrayReader.js';
import { APEv2Parser } from './apev2/APEv2Parser.js';
import { hasID3v1Header } from './id3v1/ID3v1Parser.js';
import { getLyricsHeaderLength } from './lyrics3/Lyrics3.js';

import type { IAudioMetadata, INativeTagDict, IOptions, IPicture, IPrivateOptions, IRandomReader, ITag } from './type.js';

export type { IFileInfo } from 'strtok3';

export { type IAudioMetadata, type IOptions, type ITag, type INativeTagDict, type ICommonTagsResult, type IFormat, type IPicture, type IRatio, type IChapter, type ILyricsTag, LyricsContentType, TimestampFormat, IMetadataEventTag, IMetadataEvent } from './type.js';

export type * from './ParseError.js'

/**
 * Parse Web API File
 * Requires Blob to be able to stream using a ReadableStreamBYOBReader, only available since Node.js ≥ 20
 * @param blob - Blob to parse
 * @param options - Parsing options
 * @returns Metadata
 */
export async function parseBlob(blob: Blob, options: IOptions = {}): Promise<IAudioMetadata> {
  const fileInfo: IFileInfo = {mimeType: blob.type, size: blob.size};
  if (blob instanceof File) {
    fileInfo.path = (blob as File).name;
  }
  return parseWebStream(blob.stream() as AnyWebByteStream, fileInfo, options);
}

/**
 * Parse audio from Web Stream.Readable
 * @param webStream - WebStream to read the audio track from
 * @param options - Parsing options
 * @param fileInfo - File information object or MIME-type string
 * @returns Metadata
 */
export function parseWebStream(webStream: AnyWebByteStream, fileInfo?: IFileInfo | string, options: IOptions = {}): Promise<IAudioMetadata> {
  return parseFromTokenizer(fromWebStream(webStream, {fileInfo: typeof fileInfo === 'string' ? {mimeType: fileInfo} : fileInfo}), options);
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

  const bufferReader = new RandomUint8ArrayReader(uint8Array);
  await scanAppendingHeaders(bufferReader, options);

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
  return parseOnContentType(tokenizer, options);
}

/**
 * Create a dictionary ordered by their tag id (key)
 * @param nativeTags list of tags
 * @returns tags indexed by id
 */
export function orderTags(nativeTags: ITag[]): INativeTagDict {
  const tags: INativeTagDict = {};

  for (const { id, value } of nativeTags) {
    if (!tags[id]) {
      tags[id] = [];
    }
    tags[id].push(value);
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

export async function scanAppendingHeaders(randomReader: IRandomReader, options: IPrivateOptions = {}) {

  let apeOffset = randomReader.fileSize;
  if (await hasID3v1Header(randomReader)) {
    apeOffset -= 128;
    const lyricsLen = await getLyricsHeaderLength(randomReader);
    apeOffset -= lyricsLen;
  }

  options.apeHeader = await APEv2Parser.findApeFooterOffset(randomReader, apeOffset);
}

export declare function loadMusicMetadata(): Promise<typeof import('music-metadata')>;
