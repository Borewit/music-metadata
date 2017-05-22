/**
 * Created by Maarten on 21-5-2017.
 */

import {IAudioMetadata} from "../lib";
const path = require('path');

import * as fs from 'fs-extra';
import {IOptions} from "../lib/src/index";
import {FileTokenizer} from "./FileTokenizer";

export interface IFileParser {
  parse(fileTokenizer: FileTokenizer, options: IOptions): Promise<IAudioMetadata>;
}

export class FileParser {

  // ToDo: expose warnings to API
  private warning: string[] = [];

  /**
   * Default present metadata properties
   */
  private metadata: IAudioMetadata = {
    common: {
      artists: [],
      track: {no: null, of: null},
      disk: {no: null, of: null}
    },
    format: {
      duration: null
    }
  };

  /**
   * @param filePath Path to audio file
   */
  private static getParserForExtension(filePath: string): IFileParser {
    const extension = path.extname(filePath).toLocaleLowerCase();
    switch (extension) {
      case '.mp3':
        return require('./id3v2');
      default:
        throw new Error("Extension " + extension + " not supported.");
    }
  }

  /**
   * Extract metadata from the given audio file
   * @param filePath File path of the audio file to parse
   * @param opts
   *   .filesize=true  Return filesize
   *   .native=true    Will return original header in result
   * @returns {EventEmitter}
   */
  public static parse(filePath: string, opts: IOptions = {}): Promise<IAudioMetadata> {

    return FileTokenizer.open(filePath).then((fileTokenizer) => {
      const fileParser = FileParser.getParserForExtension(filePath);
      return fileParser.parse(fileTokenizer).then((metadata) => {
        if (metadata.common.artists && metadata.common.artists.length > 0) {
          metadata.common.artist = metadata.common.artist[0];
        } else {
          if (metadata.common.artist) {
            metadata.common.artists = metadata.common.artist as any;
            if (metadata.common.artist.length > 1) {
              delete metadata.common.artist;
            } else {
              metadata.common.artist = metadata.common.artist[0];
            }
          }
        }
        return metadata;
      })
    });
  }

  /*
  private _parse(parser: IStreamParser): Promise<IAudioMetadata> {

    let isDone = false;
    let hasReadData = false;
    const self = this;


    istream.once('data', (result) => {
      hasReadData = true;
      streamParser = common.getParserForMediaType(MusicMetadataParser.headerTypes, result);
      streamParser.parse(istream, (headerType, tag, value) => {
        tagCallback(headerType, tag, value);
      }, done, opts.duration, fsize);
      // re-emitting the first data chunk so the
      // parser picks the stream up from the start
      istream.emit('data', result);
    });

    istream.once('end', () => {
      if (!hasReadData) {
        done(new Error('Could not read any data from this stream'));
      } else {
        if (!isDone) {
          isDone = true;
          // Ensure the parsers 'end' handlers is executed first
          if (streamParser && streamParser.end) {
            streamParser.end(tagCallback, done);
          } else done();
        }
      }

    });

    istream.on('close', onClose);

    function onClose() {
      done(new Error('Unexpected end of stream'));
    }

    function done(err?: Error) {
      isDone = true;
      istream.removeListener('close', onClose);

      if (!err) {
        if (metadata.common.artists && metadata.common.artists.length > 0) {
          metadata.common.artist = metadata.common.artist[0];
        } else {
          if (metadata.common.artist) {
            metadata.common.artists = metadata.common.artist as any;
            if (metadata.common.artist.length > 1) {
              delete metadata.common.artist;
            } else {
              metadata.common.artist = metadata.common.artist[0];
            }
          }
        }

        // We only emit aliased events once the 'done' event has been raised,
        // this is because an alias like 'artist' could have values split
        // over many data chunks.
        for (const _alias in metadata.common) {
          if (metadata.common.hasOwnProperty(_alias)) {
            emitter.emit(_alias, metadata.common[_alias]);
          }
        }
      }

      if (callback) {
        callback(err, metadata);
      }
      return strtok.DONE;
    }

    return emitter;
  }*/

}

