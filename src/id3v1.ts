'use strict';
import * as strtok from 'strtok2';
import common from './common';
import {MpegParser} from './mpeg';
import {Done, IStreamParser, TagCallback} from './parser';

class Id3v1Parser implements IStreamParser {

  public static getInstance(): Id3v1Parser {
    return new Id3v1Parser();
  }

  private static parseTag(buf: Buffer, offset: number, end: number, type, tag, callback: TagCallback): void {
    let value = buf.toString('ascii', offset, end);
    value = value.trim().replace(/\x00/g, '');
    if ( value.length > 0) {
      callback(type, tag, value);
    }
  }

  private endData: Buffer;
  private type = 'id3v1.1';
  private mpegParser: MpegParser;

  public parse(stream, callback: TagCallback, done, readDuration?, fileSize?) {

    let mp3Done = false;
    let id3Done = false;

    stream.on('data', (data) => {
      this.endData = data;
    });

    this.mpegParser = new MpegParser(128);
    this.mpegParser.parse(stream, callback, (err) => {
        mp3Done = true;
        if (id3Done) {
          return done(err);
        } else return strtok.DONE;
      }, readDuration, fileSize);
  }

  public end (callback: TagCallback, done: Done) {

    let offset = this.endData.length - 128;
    let header = this.endData.toString('ascii', offset, offset += 3);
    if (header !== 'TAG') {
      return done(new Error('Could not find metadata header'));
    }

    callback('format', 'headerType', this.type);

    Id3v1Parser.parseTag(this.endData, offset, offset += 30, this.type, 'title', callback);
    Id3v1Parser.parseTag(this.endData, offset, offset += 30, this.type, 'artist', callback);
    Id3v1Parser.parseTag(this.endData, offset, offset += 30, this.type, 'album', callback);
    Id3v1Parser.parseTag(this.endData, offset, offset += 4, this.type, 'year', callback);
    Id3v1Parser.parseTag(this.endData, offset, offset += 28, this.type, 'comment', callback);

    let track = this.endData[this.endData.length - 2];
    callback(this.type, 'track', track);

    if (this.endData[this.endData.length - 1] in common.GENRES) {
      let genre = common.GENRES[this.endData[this.endData.length - 1]];
      callback(this.type, 'genre', genre);
    }

    if (this.mpegParser) {
      this.mpegParser.end(callback, done);
    }
  }
}

module.exports = Id3v1Parser.getInstance();
