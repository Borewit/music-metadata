import {INativeAudioMetadata, IOptions} from "./";
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
import {WavePcmParser} from "./riff/RiffParser";
import {WavPackParser} from "./wavpack/WavPackParser";
import {MpegParser} from "./mpeg/MpegParser";

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

    return strtok3.fromFile(filePath).then(fileTokenizer => {
      return ParserFactory.getParserForExtension(filePath).then(parser => {
        return parser.parse(fileTokenizer, opts).then(metadata => {
          return fileTokenizer.close().then(() => {
            return metadata;
          });
        });
      }).catch(err => {
        return fileTokenizer.close().then(() => {
          throw err;
        });
      });
    });
  }

  /**
   * Parse metadata from stream
   * @param stream Node stream
   * @param mimeType The mime-type, e.g. "audio/mpeg", extension e.g. ".mp3" or filename. This is used to redirect to the correct parser.
   * @param opts Parsing options
   * @returns {Promise<INativeAudioMetadata>}
   */
  public static parseStream(stream: Stream.Readable, mimeType: string, opts: IOptions = {}): Promise<INativeAudioMetadata> {

    return strtok3.fromStream(stream).then(tokenizer => {
      if (!tokenizer.fileSize && opts.fileSize) {
        tokenizer.fileSize = opts.fileSize;
      }

      return ParserFactory.getParserForMimeType(mimeType).then(parser => {
        return parser.parse(tokenizer, opts);
      });
    });
  }

  /**
   * @param filePath Path to audio file
   */
  private static getParserForExtension(filePath: string): Promise<ITokenParser> {
    const extension = path.extname(filePath).toLocaleLowerCase() || filePath;
    switch (extension) {

      case ".mp2":
      case ".mp3":
      case ".m2a":
        return Promise.resolve<ITokenParser>(new MpegParser());

      case ".ape":
        return Promise.resolve<ITokenParser>(new APEv2Parser());

      case ".aac":
      case ".mp4":
      case ".m4a":
      case ".m4b":
      case ".m4pa":
      case ".m4v":
      case ".m4r":
      case ".3gp":
        return Promise.resolve<ITokenParser>(new MP4Parser());

      case ".wma":
      case ".wmv":
      case ".asf":
        return Promise.resolve<ITokenParser>(new AsfParser());

      case ".flac":
        return Promise.resolve<ITokenParser>(new FlacParser());

      case ".ogg":
      case ".ogv":
      case ".oga":
      case ".ogx":
        return Promise.resolve<ITokenParser>(new OggParser());

      case ".aif":
      case ".aiff":
      case ".aifc":
        return Promise.resolve<ITokenParser>(new AIFFParser());

      case ".wav":
        return Promise.resolve<ITokenParser>(new WavePcmParser());

      case ".wv":
      case ".wvp":
        return Promise.resolve<ITokenParser>(new WavPackParser());

      default:
        throw new Error("Extension " + extension + " not supported.");
    }
  }

  /**
   * @param {string} mimeType MIME-Type, extension, path or filename
   * @returns {Promise<ITokenParser>}
   */
  private static getParserForMimeType(mimeType: string): Promise<ITokenParser> {
    switch (mimeType) {

      case "audio/mpeg":
        return Promise.resolve<ITokenParser>(new MpegParser()); // ToDo: handle ID1 header as well

      case "audio/x-monkeys-audio":
        return Promise.resolve<ITokenParser>(new APEv2Parser());

      case "audio/aac":
      case "audio/aacp":
      case "audio/mp4":
      case "audio/x-aac":
        return Promise.resolve<ITokenParser>(new MP4Parser());

      case "video/x-ms-asf":
      case "audio/x-ms-wma":
        return Promise.resolve<ITokenParser>(new AsfParser());

      case "audio/flac":
      case "audio/x-flac":
        return Promise.resolve<ITokenParser>(new FlacParser());

      case "audio/ogg":
      case "application/ogg":
      case "video/ogg":
        return Promise.resolve<ITokenParser>(new OggParser());

      case "audio/aiff":
      case "audio/x-aif":
      case "audio/x-aifc":
        return Promise.resolve<ITokenParser>(new AIFFParser());

      case "audio/wav":
      case "audio/wave":
        return Promise.resolve<ITokenParser>(new WavePcmParser());

      case "audio/x-wavpack":
        return Promise.resolve<ITokenParser>(new WavPackParser());

      default:
        // Interpret mimeType as extension
        return ParserFactory.getParserForExtension(mimeType).catch(() => {
          throw new Error("MIME-Type: " + mimeType + " not supported.");
        });
    }
  }

  // ToDo: obsolete
  private static hasStartTag(filePath: string, tagIdentifier: string): Promise<boolean> {
    return strtok3.fromFile(filePath).then(tokenizer => {
      return tokenizer.readToken(new StringType(tagIdentifier.length, "ascii")).then(token => {
        return token === tagIdentifier;
      });
    });
  }

  // ToDo: expose warnings to API
  private warning: string[] = [];

}
