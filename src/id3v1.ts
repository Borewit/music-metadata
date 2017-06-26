'use strict';

import {MpegParser} from './mpeg';
import {ITokenParser} from "./ParserFactory";
import {INativeAudioMetadata, IOptions} from "./index";
import {HeaderType} from "./tagmap";
import Common from "./common";
import {ITokenizer} from "strtok3";
import {IGetToken, StringType} from "token-types";
import * as Token from "token-types";

/**
 * ID3v1 tag header interface
 */
interface Iid3v1Header {
  header: string,
  title: string,
  artist: string,
  album: string,
  year: string,
  comment: string,
  zeroByte: number,
  track: number,
  genre: number
}

/**
 * Ref: https://en.wikipedia.org/wiki/ID3
 * @type {{len: number; get: ((buf, off)=>Iid3v1Header)}}
 */
const Iid3v1Token: IGetToken<Iid3v1Header> = {
  len: 128,

  get: (buf, off):  Iid3v1Header => {
    return {
      header: new Id3v1StringType(3, 'ascii').get(buf, off),
      title: new Id3v1StringType(30, 'ascii').get(buf, off + 3),
      artist: new Id3v1StringType(30, 'ascii').get(buf, off + 33),
      album: new Id3v1StringType(30, 'ascii').get(buf, off + 63),
      year: new Id3v1StringType(4, 'ascii').get(buf, off + 93),
      comment: new Id3v1StringType(28, 'ascii').get(buf, off + 97),
      zeroByte: Token.INT8.get(buf, off + 127),
      track: Token.INT8.get(buf, off + 126),
      genre: Token.INT8.get(buf, off + 127)
    };
  }
};

class Id3v1StringType extends StringType {

  public get(buf: Buffer, off: number): string {
    let value = super.get(buf, off);
    value = value.trim().replace(/\x00/g, '');
    return value.length > 0 ? value : undefined;
  }
}

export class Id3v1Parser implements ITokenParser {

  public static getInstance(): Id3v1Parser {
    return new Id3v1Parser();
  }

  private mpegParser: MpegParser;

  public parse(tokenizer: ITokenizer, options: IOptions): Promise<INativeAudioMetadata> {

    this.mpegParser = new MpegParser(tokenizer, 128, options && options.duration);
    return this.mpegParser.parse().then((format) => {
      return tokenizer.readToken<Iid3v1Header>(Iid3v1Token, tokenizer.fileSize - Iid3v1Token.len).then((header) => {
        const res = {
          format: format,
          native: {
            'id3v1.1': [
              {id: 'title', value: header.title},
              {id: 'artist', value: header.artist},
              {id: 'album', value: header.album},
              {id: 'comment', value: header.comment},
              {id: 'track', value: header.track},
              {id: 'year', value: header.year},
              {id: 'genre', value: Id3v1Parser.getGenre(header.genre)},
            ]
          }
        };
        res.format.headerType = 'id3v1.1' as HeaderType;
        return res;
      })
    });
  }

  private static getGenre(genreIndex: number): string {
    if(genreIndex < Common.Genres.length ) {
      return Common.Genres[genreIndex];
    }
    return undefined; // ToDO: generate warning
  }

  /*
  public end(callback: TagCallback, done: Done) {

    let offset = this.endData.length - 128;
    const header = this.endData.toString('ascii', offset, offset += 3);
    if (header !== 'TAG') {
      return done(new Error('Could not find metadata header'));
    }

    callback('format', 'headerType', this.type);

    Id3v1Parser.parseTag(this.endData, offset, offset += 30, this.type, 'title', callback);
    Id3v1Parser.parseTag(this.endData, offset, offset += 30, this.type, 'artist', callback);
    Id3v1Parser.parseTag(this.endData, offset, offset += 30, this.type, 'album', callback);
    Id3v1Parser.parseTag(this.endData, offset, offset += 4, this.type, 'year', callback);
    Id3v1Parser.parseTag(this.endData, offset, offset += 28, this.type, 'comment', callback);

    const track = this.endData[this.endData.length - 2];
    callback(this.type, 'track', track);

    if (this.endData[this.endData.length - 1] in common.GENRES) {
      const genre = common.GENRES[this.endData[this.endData.length - 1]];
      callback(this.type, 'genre', genre);
    }

    if (this.mpegParser) {
      this.mpegParser.end(callback, done);
    }
  }*/
}

