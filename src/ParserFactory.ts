import {INativeAudioMetadata, IOptions} from "./";
import {ID3v2Parser} from "./id3v2/ID3v2Parser";
import {ID3v1Parser} from "./id3v1/ID3v1Parser";
import {APEv2Parser} from "./apev2/APEv2Parser";
import {AsfParser} from "./asf/AsfParser";
import {FlacParser} from "./flac/FlacParser";
import {MP4Parser} from "./mp4/MP4Parser";
import {OggParser} from "./ogg/OggParser";
import * as strtok3 from "strtok3";
import {StringType} from "token-types";
import {Promise} from "es6-promise";
import * as Stream from "stream";
import * as path from "path";
import {AIFFParser} from "./aiff/AiffParser";

export interface ITokenParser {
  parse(tokenizer: strtok3.ITokenizer, options: IOptions): Promise<INativeAudioMetadata>;
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

    return strtok3.fromFile(filePath).then((fileTokenizer) => {
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
   * Parse metadata from stream
   * @param stream
   * @param mimeType The mime-type, e.g. "audio/mpeg". This is used to redirect to the correct parser.
   * @param opts Parsing options
   * @returns {Promise<INativeAudioMetadata>}
   */
  public static parseStream(stream: Stream.Readable, mimeType: string, opts: IOptions = {}): Promise<INativeAudioMetadata> {

    return strtok3.fromStream(stream).then((tokenizer) => {
      if (!tokenizer.fileSize && opts.fileSize) {
        tokenizer.fileSize = opts.fileSize;
      }

      return ParserFactory.getParserForMimeType(mimeType).then((parser) => {
        return parser.parse(tokenizer, opts);
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
          return hasID3 ? new ID3v2Parser() : new ID3v1Parser();
        });

      case '.ape':
        return Promise.resolve<ITokenParser>(new APEv2Parser());

      case '.aac':
      case '.mp4':
      case '.m4a':
        return Promise.resolve<ITokenParser>(new MP4Parser());

      case '.wma':
      case '.wmv':
      case '.asf':
        return Promise.resolve<ITokenParser>(new AsfParser());

      case '.flac':
        return Promise.resolve<ITokenParser>(new FlacParser());

      case '.ogg':
        return Promise.resolve<ITokenParser>(new OggParser());

      case '.aiff':
        return Promise.resolve<ITokenParser>(new AIFFParser());

      default:
        throw new Error("Extension " + extension + " not supported.");
    }
  }

  private static getParserForMimeType(mimeType: string): Promise<ITokenParser> {
    switch (mimeType) {

      case 'audio/mpeg':
        return Promise.resolve<ITokenParser>(new ID3v2Parser()); // ToDo: handle ID1 header as well

      case 'audio/x-monkeys-audio':
        return Promise.resolve<ITokenParser>(new APEv2Parser());

      case 'audio/mp4':
        return Promise.resolve<ITokenParser>(new MP4Parser());

      case 'audio/x-ms-wma':
        return Promise.resolve<ITokenParser>(new AsfParser());

      case 'audio/flac':
        return Promise.resolve<ITokenParser>(new FlacParser());

      case 'audio/ogg':
        return Promise.resolve<ITokenParser>(new OggParser());

      case 'audio/aac':
      case 'audio/aacp':
        return Promise.resolve<ITokenParser>(new MP4Parser());

      default:
        throw new Error("MIME-Type: " + mimeType + " not supported.");
    }
  }

  // ToDo: obsolete
  private static hasStartTag(filePath: string, tagIdentifier: string): Promise<boolean> {
    return strtok3.fromFile(filePath).then((tokenizer) => {
      return tokenizer.readToken(new StringType(tagIdentifier.length, 'ascii')).then((token) => {
        return token === tagIdentifier;
      });
    });
  }

  // ToDo: expose warnings to API
  private warning: string[] = [];

}
