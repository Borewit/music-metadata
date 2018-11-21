import * as Stream from 'stream';
import * as Path from 'path';
import * as strtok3 from 'strtok3';

import * as Core from './core';
import {MetadataCollector} from './common/MetadataCollector';
import {ParserFactory} from './ParserFactory';
import * as Type from './type';

export type IAudioMetadata = Type.IAudioMetadata;
export type IOptions = Type.IOptions;
export type ITag = Type.ITag;
export type INativeTagDict = Type.INativeTagDict;

/**
 * Parse audio from Node Stream.Readable
 * @param {Stream.Readable} Stream to read the audio track from
 * @param {string} mimeType Content specification MIME-type, e.g.: 'audio/mpeg'
 * @param {IOptions} options Parsing options
 * @returns {Promise<IAudioMetadata>}
 */
export function parseStream(stream: Stream.Readable, mimeType?: string, options: IOptions = {}): Promise<IAudioMetadata> {
  return strtok3.fromStream(stream).then(tokenizer => {
    return Core.parseFromTokenizer(tokenizer, mimeType, options);
  });
}

/**
 * Parse audio from Node Buffer
 * @param {Stream.Readable} stream Audio input stream
 * @param {string} mimeType <string> Content specification MIME-type, e.g.: 'audio/mpeg'
 * @param {IOptions} options Parsing options
 * @returns {Promise<IAudioMetadata>}
 * Ref: https://github.com/Borewit/strtok3/blob/e6938c81ff685074d5eb3064a11c0b03ca934c1d/src/index.ts#L15
 */
export const parseBuffer = Core.parseBuffer;

/**
 * Parse audio from Node file
 * @param {string} filePath Media file to read meta-data from
 * @param {IOptions} options Parsing options
 * @returns {Promise<IAudioMetadata>}
 */
export function parseFile(filePath: string, options: IOptions = {}): Promise<IAudioMetadata> {
  return strtok3.fromFile(filePath).then(fileTokenizer => {
    const parserName = ParserFactory.getParserIdForExtension(filePath);
    if (parserName) {
      return ParserFactory.loadParser(parserName, options).then(parser => {
        const metadata = new MetadataCollector(options);
        return parser.init(metadata, fileTokenizer, options).parse().then(() => {
          return fileTokenizer.close().then(() => {
            return metadata.toCommonMetadata();
          });
        }).catch(err => {
          return fileTokenizer.close().then(() => {
            throw err;
          });
        });
      });
    } else {
      throw new Error('No parser found for extension: ' + Path.extname(filePath));
    }
  });
}

/**
 * Create a dictionary ordered by their tag id (key)
 * @param {ITag[]} nativeTags list of tags
 * @returns {INativeTagDict} Tags indexed by id
 */
export const orderTags = Core.orderTags;

/**
 * Convert rating to 1-5 star rating
 * @param {number} rating Normalized rating [0..1] (common.rating[n].rating)
 * @returns {number} Number of stars: 1, 2, 3, 4 or 5 stars
 */
export const ratingToStars = Core.ratingToStars;
