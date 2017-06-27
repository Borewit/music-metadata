import {INativeAudioMetadata, IOptions} from "./";
import {Id3v2Parser} from "./id3v2";
import {Id3v1Parser} from "./id3v1";
import {ApeParser} from "./monkeysaudio";
import {AsfParser} from "./asf";
import {FlacParser} from "./flac";
import {Id4Parser} from "./id4";
import {OggParser} from "./ogg";
import {ITokenizer, FileTokenizer, ReadStreamTokenizer} from "strtok3";
import {StringType} from "token-types";
import {Promise} from "es6-promise";
import * as stream from "stream";

const path = require('path');

export interface ITokenParser {
  parse(tokenizer: ITokenizer, options: IOptions): Promise<INativeAudioMetadata>;
}

export class ParserFactory {

  /**
   * Extract metadata from the given audio file
   * @param filePath File path of the audio file to parse
   * @param opts
   *   .fileSize=true  Return filesize
   *   .native=true    Will return original header in result
   * @returns {Promise<INativeAudioMetadata>}
   */
  public static parseFile(filePath: string, opts: IOptions = {}): Promise<INativeAudioMetadata> {

    return FileTokenizer.open(filePath).then((fileTokenizer) => {
      return ParserFactory.getParserForExtension(filePath).then((parser) => {
        return parser.parse(fileTokenizer, opts).then((metadata) => {
          return fileTokenizer.close().then(() => {
            return metadata;
          });
        });
      }).catch((err) => {
        return fileTokenizer.close().then(() => {
          throw err;
        });
      });
    });
  }

  /**
   * @param filePath Path to audio file
   */
  private static getParserForExtension(filePath: string): Promise<ITokenParser> {
    const extension = path.extname(filePath).toLocaleLowerCase();
    switch (extension) {

      case '.mp3':
        return this.hasStartTag(filePath, 'ID3').then((hasID3) => {
          return hasID3 ? new Id3v2Parser() : new Id3v1Parser();
        });

      case '.ape':
        return Promise.resolve<ITokenParser>(new ApeParser());

      case '.m4a':
        return Promise.resolve<ITokenParser>(new Id4Parser());

      case '.wma':
        return Promise.resolve<ITokenParser>(new AsfParser());

      case '.flac':
        return Promise.resolve<ITokenParser>(new FlacParser());

      case '.ogg':
        return Promise.resolve<ITokenParser>(new OggParser());

      default:
        throw new Error("Extension " + extension + " not supported.");
    }
  }

  private static getParserForMimeType(mimeType: string): Promise<ITokenParser> {
    switch (mimeType) {

      case 'audio/mpeg':
        return Promise.resolve<ITokenParser>(new Id3v2Parser()); // ToDo: handle ID1 header as well

      case 'audio/x-monkeys-audio':
        return Promise.resolve<ITokenParser>(new ApeParser());

      case 'audio/mp4':
        return Promise.resolve<ITokenParser>(new Id4Parser());

      case 'audio/x-ms-wma':
        return Promise.resolve<ITokenParser>(new AsfParser());

      case 'audio/flac':
        return Promise.resolve<ITokenParser>(new FlacParser());

      case 'audio/ogg':
        return Promise.resolve<ITokenParser>(new OggParser());

      default:
        throw new Error("MIME-Type: " + mimeType + " not supported.");
    }
  }

  // ToDo: obsolete
  private static hasStartTag(filePath: string, tagIdentifier: string): Promise<boolean> {
    return FileTokenizer.open(filePath).then((tokenizer) => {
      return tokenizer.readToken(new StringType(tagIdentifier.length, 'ascii')).then((token) => {
        return token === tagIdentifier;
      });
    });
  }

  // ToDo: expose warnings to API
  private warning: string[] = [];

  public static parseStream(stream: stream.Readable, mimeType: string, opts: IOptions = {}): Promise<INativeAudioMetadata> {

    return ReadStreamTokenizer.read(stream).then((tokenizer) => {
      if (!tokenizer.fileSize && opts.fileSize) {
        tokenizer.fileSize = opts.fileSize;
      }

      return ParserFactory.getParserForMimeType(mimeType).then((parser) => {
        return parser.parse(tokenizer, opts);
      })
    });
  }
}
