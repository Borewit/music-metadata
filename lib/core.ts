import * as Stream from 'stream';
import * as strtok3 from 'strtok3/lib/core';
import {ITokenizer} from 'strtok3';

import {ParserFactory} from './ParserFactory';
import { IAudioMetadata, INativeTagDict, IOptions, IPrivateOptions, IRandomReader, ITag } from './type';
import { RandomBufferReader } from './common/RandomBufferReader';
import { APEv2Parser } from './apev2/APEv2Parser';
import { hasID3v1Header } from './id3v1/ID3v1Parser';
import { getLyricsHeaderLength } from './lyrics3/Lyrics3';

/**
 * Parse audio from Node Stream.Readable
 * @param stream - Stream to read the audio track from
 * @param mimeType - Content specification MIME-type, e.g.: 'audio/mpeg'
 * @param options - Parsing options
 * @returns Metadata
 */
export function parseStream(stream: Stream.Readable, mimeType?: string, options: IOptions = {}): Promise<IAudioMetadata> {
  return parseFromTokenizer(strtok3.fromStream(stream), mimeType, options);
}

/**
 * Parse audio from Node Buffer
 * @param buf - Buffer holding audio data
 * @param mimeType - Content specification MIME-type, e.g.: 'audio/mpeg'
 * @param options - Parsing options
 * @returns Metadata
 * Ref: https://github.com/Borewit/strtok3/blob/e6938c81ff685074d5eb3064a11c0b03ca934c1d/src/index.ts#L15
 */
export async function parseBuffer(buf: Buffer, mimeType?: string, options: IOptions = {}): Promise<IAudioMetadata> {

  const bufferReader = new RandomBufferReader(buf);
  await scanAppendingHeaders(bufferReader, options);

  const tokenizer = strtok3.fromBuffer(buf);
  return parseFromTokenizer(tokenizer, mimeType, options);
}

/**
 * Parse audio from ITokenizer source
 * @param tokenizer - Audio source implementing the tokenizer interface
 * @param mimeType - Content specification MIME-type, e.g.: 'audio/mpeg'
 * @param options - Parsing options
 * @returns Metadata
 */
export function parseFromTokenizer(tokenizer: ITokenizer, mimeType?: string, options?: IOptions): Promise<IAudioMetadata> {
  if (!tokenizer.fileSize && options && options.fileSize) {
    tokenizer.fileSize = options.fileSize;
  }
  return ParserFactory.parseOnContentType(tokenizer, mimeType, options);
}

/**
 * Create a dictionary ordered by their tag id (key)
 * @param nativeTags list of tags
 * @returns tags indexed by id
 */
export function orderTags(nativeTags: ITag[]): INativeTagDict {
  const tags = {};
  for (const tag of nativeTags) {
    (tags[tag.id] = (tags[tag.id] || [])).push(tag.value);
  }
  return tags;
}

/**
 * Convert rating to 1-5 star rating
 * @param rating: Normalized rating [0..1] (common.rating[n].rating)
 * @returns Number of stars: 1, 2, 3, 4 or 5 stars
 */
export function ratingToStars(rating: number): number {
  return rating === undefined ? 0 : 1 + Math.round(rating * 4);
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
