import {INativeAudioMetadata, IOptions} from "./";
import {APEv2Parser} from "./apev2/APEv2Parser";
import {AsfParser} from "./asf/AsfParser";
import {FlacParser} from "./flac/FlacParser";
import {MP4Parser} from "./mp4/MP4Parser";
import {OggParser} from "./ogg/OggParser";
import * as strtok3 from "strtok3";
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
      const parser = ParserFactory.getParserForExtension(filePath);
      if (parser) {
        return parser.parse(fileTokenizer, opts).then(metadata => {
          return fileTokenizer.close().then(() => {
            return metadata;
          });
        }).catch(err => {
          return fileTokenizer.close().then(() => {
            throw err;
          });
        });
      } else {
        throw new Error('No parser found for extension: ' + path.extname(filePath));
      }
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

      // Interpret mimeType as extension
      const parser = ParserFactory.getParserForMimeType(mimeType) || ParserFactory.getParserForExtension(mimeType) as ITokenParser;

      if (!parser) {
        // No MIME-type mapping found
        throw new Error("MIME-type or extension not supported: " + mimeType);
      }

      // Parser found, execute parser
      return parser.parse(tokenizer, opts);
    });
  }

  /**
   * @param filePath Path, filename or extension to audio file
   * @return ITokenParser if extension is supported; otherwise false
   */
  private static getParserForExtension(filePath: string): ITokenParser | false {
    const extension = path.extname(filePath).toLocaleLowerCase() || filePath;

    switch (extension) {

      case ".mp2":
      case ".mp3":
      case ".m2a":
        return new MpegParser();

      case ".ape":
        return new APEv2Parser();

      case ".aac":
      case ".mp4":
      case ".m4a":
      case ".m4b":
      case ".m4pa":
      case ".m4v":
      case ".m4r":
      case ".3gp":
        return new MP4Parser();

      case ".wma":
      case ".wmv":
      case ".asf":
        return new AsfParser();

      case ".flac":
        return new FlacParser();

      case ".ogg":
      case ".ogv":
      case ".oga":
      case ".ogx":
      case ".opus": // recommended filename extension for Ogg Opus files
        return new OggParser();

      case ".aif":
      case ".aiff":
      case ".aifc":
        return new AIFFParser();

      case ".wav":
        return new WavePcmParser();

      case ".wv":
      case ".wvp":
        return new WavPackParser();

      default:
        return false;
    }
  }

  /**
   * @param {string} mimeType MIME-Type, extension, path or filename
   * @returns ITokenParser if MIME-type is supported; otherwise false
   */
  private static getParserForMimeType(mimeType: string): ITokenParser | false {
    switch (mimeType) {

      case "audio/mpeg":
        return new MpegParser(); // ToDo: handle ID1 header as well

      case "audio/x-monkeys-audio":
        return new APEv2Parser();

      case "audio/aac":
      case "audio/aacp":
      case "audio/mp4":
      case "audio/x-aac":
      case "audio/x-m4a":
        return new MP4Parser();

      case "video/x-ms-asf":
      case "audio/x-ms-wma":
        return new AsfParser();

      case "audio/flac":
      case "audio/x-flac":
        return new FlacParser();

      case "audio/ogg": // RFC 7845
      case "application/ogg":
      case "video/ogg":
        return new OggParser();

      case "audio/aiff":
      case "audio/x-aif":
      case "audio/x-aifc":
        return new AIFFParser();

      case "audio/wav":
      case "audio/wave":
        return new WavePcmParser();

      case "audio/x-wavpack":
        return new WavPackParser();

      default:
        return false;
    }
  }

  // ToDo: expose warnings to API
  private warning: string[] = [];

}
