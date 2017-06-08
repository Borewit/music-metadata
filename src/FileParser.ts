import {Id3v2Parser} from "./id3v2";
/**
 * Created by Maarten on 21-5-2017.
 */

const path = require('path');

import {IOptions} from "../lib/src/index";
import {FileTokenizer, ITokenizer, StringType} from "./FileTokenizer";
import {INativeAudioMetadata} from "./index";
import {Id3v1Parser} from "./id3v1";
import {ApeParser} from "./monkeysaudio";
import {AsfParser} from "./asf";
import {FlacParser} from "./flac";
import {Id4Parser} from "./id4";


export interface ITokenParser {
  parse(tokenizer: ITokenizer, options: IOptions): Promise<INativeAudioMetadata>;
}

export class FileParser {

  // ToDo: expose warnings to API
  private warning: string[] = [];

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
        return Promise.resolve<ITokenParser>( new ApeParser() );

      case '.m4a':
        return Promise.resolve<ITokenParser>( new Id4Parser() );

      case '.wma':
        return Promise.resolve<ITokenParser>( new AsfParser() );

        case '.flac':
        return Promise.resolve<ITokenParser>( new FlacParser() );

      default:
        throw new Error("Extension " + extension + " not supported.");
    }
  }

  private static hasStartTag(filePath: string, tagIdentifier: string): Promise<boolean> {
    return FileTokenizer.open(filePath).then((tokenizer) => {
      return tokenizer.readToken(new StringType(tagIdentifier.length, 'ascii')).then((token) => {
        return token === tagIdentifier;
      })
    })
  }

  /**
   * Extract metadata from the given audio file
   * @param filePath File path of the audio file to parse
   * @param opts
   *   .filesize=true  Return filesize
   *   .native=true    Will return original header in result
   * @returns {EventEmitter}
   */
  public static parse(filePath: string, opts: IOptions = {}): Promise<INativeAudioMetadata> {

    return FileTokenizer.open(filePath).then((fileTokenizer) => {
      return FileParser.getParserForExtension(filePath).then((parser) => {
        return parser.parse(fileTokenizer, opts);
      });
    });
  }
}




