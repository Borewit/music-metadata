import { Readable } from "stream";
import * as strtok3 from "strtok3/lib/core";

import { ParserFactory } from "./ParserFactory";
import {
  IAudioMetadata,
  INativeTagDict,
  IOptions,
  IPicture,
  IPrivateOptions,
  IRandomReader,
  ITag,
} from "./type";
import { RandomUint8ArrayReader } from "./common/RandomUint8ArrayReader";
import { APEv2Parser } from "./apev2/APEv2Parser";
import { hasID3v1Header } from "./id3v1/ID3v1Parser";
import { getLyricsHeaderLength } from "./lyrics3/Lyrics3";

export { IFileInfo } from "strtok3/lib/core";

/**
 * Parse audio from Node Stream.Readable
 * @param stream - Stream to read the audio track from
 * @param options - Parsing options
 * @param fileInfo - File information object or MIME-type string
 * @returns Metadata
 */
export function parseStream(
  stream: Readable,
  fileInfo?: strtok3.IFileInfo | string,
  options: IOptions = {}
): Promise<IAudioMetadata> {
  return parseFromTokenizer(
    strtok3.fromStream(
      stream,
      typeof fileInfo === "string" ? { mimeType: fileInfo } : fileInfo
    ),
    options
  );
}

/**
 * Parse audio from Node Buffer
 * @param uint8Array - Uint8Array holding audio data
 * @param fileInfo - File information object or MIME-type string
 * @param options - Parsing options
 * @returns Metadata
 * Ref: https://github.com/Borewit/strtok3/blob/e6938c81ff685074d5eb3064a11c0b03ca934c1d/src/index.ts#L15
 */
export async function parseBuffer(
  uint8Array: Uint8Array,
  fileInfo?: strtok3.IFileInfo | string,
  options: IOptions = {}
): Promise<IAudioMetadata> {
  const bufferReader = new RandomUint8ArrayReader(uint8Array);
  await scanAppendingHeaders(bufferReader, options);

  const tokenizer = strtok3.fromBuffer(
    uint8Array,
    typeof fileInfo === "string" ? { mimeType: fileInfo } : fileInfo
  );
  return parseFromTokenizer(tokenizer, options);
}

/**
 * Parse audio from ITokenizer source
 * @param tokenizer - Audio source implementing the tokenizer interface
 * @param options - Parsing options
 * @returns Metadata
 */
export function parseFromTokenizer(
  tokenizer: strtok3.ITokenizer,
  options?: IOptions
): Promise<IAudioMetadata> {
  return ParserFactory.parseOnContentType(tokenizer, options);
}

/**
 * Create a dictionary ordered by their tag id (key)
 * @param nativeTags list of tags
 * @returns tags indexed by id
 */
export function orderTags(nativeTags: ITag[]): INativeTagDict {
  const tags = {};
  for (const tag of nativeTags) {
    (tags[tag.id] = tags[tag.id] || []).push(tag.value);
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

/**
 * Select most likely cover image.
 * @param pictures Usually metadata.common.picture
 * @return Cover image, if any, otherwise null
 */
export function selectCover(pictures?: IPicture[]): IPicture | null {
  return pictures
    ? pictures.reduce((acc, cur) => {
        if (
          cur.name &&
          cur.name.toLowerCase() in ["front", "cover", "cover (front)"]
        )
          return cur;
        return acc;
      })
    : null;
}

export async function scanAppendingHeaders(
  randomReader: IRandomReader,
  options: IPrivateOptions = {}
) {
  let apeOffset = randomReader.fileSize;
  if (await hasID3v1Header(randomReader)) {
    apeOffset -= 128;
    const lyricsLen = await getLyricsHeaderLength(randomReader);
    apeOffset -= lyricsLen;
  }

  options.apeHeader = await APEv2Parser.findApeFooterOffset(
    randomReader,
    apeOffset
  );
}
