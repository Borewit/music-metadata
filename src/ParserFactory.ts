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
import {MimeType} from "./common/MimeType";
import * as fileType from "file-type";

import * as _debug from "debug";

const debug = _debug("music-metadata:parser:factory");

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
      return this.parse(tokenizer, mimeType, opts);
    });
  }

  /**
   *  Parse metadata from tokenizer
   * @param {ITokenizer} tokenizer
   * @param {string} contentType
   * @param {IOptions} opts
   * @returns {Promise<INativeAudioMetadata>}
   */
  public static parse(tokenizer: strtok3.ITokenizer, contentType: string, opts: IOptions = {}): Promise<INativeAudioMetadata> {

    // Resolve parser based on MIME-type or file extension
    let parser = ParserFactory.getParserForMimeType(contentType) || ParserFactory.getParserForExtension(contentType) as ITokenParser;

    if (!parser) {
      // No MIME-type mapping found
      debug("No parser found for MIME-type / extension:" + contentType);

      const buf = Buffer.alloc(4100);
      return tokenizer.peekBuffer(buf).then(() => {
        const guessedType = fileType(buf);
        if (!guessedType)
          throw new Error("Failed to guess MIME-type");
        parser = ParserFactory.getParserForMimeType(guessedType.mime) as ITokenParser;
        if (!parser)
          throw new Error("Guessed MIME-type not supported: " + guessedType.mime);
        return parser.parse(tokenizer, opts);
      });
    }

    // Parser found, execute parser
    return parser.parse(tokenizer, opts);
  }

  /**
   * @param filePath Path, filename or extension to audio file
   * @return ITokenParser if extension is supported; otherwise false
   */
  private static getParserForExtension(filePath: string): ITokenParser {
    if (!filePath)
      return;

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
    }
  }

  /**
   * @param {string} mimeType MIME-Type, extension, path or filename
   * @returns ITokenParser if MIME-type is supported; otherwise false
   */
  private static getParserForMimeType(mimeType: string): ITokenParser | false {

    let mime;
    try {
      mime = MimeType.parse(mimeType);
    } catch (err) {
      debug(`Invalid MIME-type: ${mimeType}`);
      return;
    }

    const subType = mime.subtype.indexOf('x-') === 0 ? mime.subtype.substring(2) : mime.subtype;

    switch (mime.type) {

      case 'audio':
        switch (subType) {

          case 'mpeg':
            return new MpegParser(); // ToDo: handle ID1 header as well

          case 'monkeys-audio':
            return new APEv2Parser();

          case 'mp4':
          case 'aac':
          case 'aacp':
          case 'm4a':
            return new MP4Parser();

          case 'ms-wma':
            return new AsfParser();

          case 'flac':
            return new FlacParser();

          case 'ogg': // RFC 7845
            return new OggParser();

          case 'aiff':
          case 'aif':
          case 'aifc':
            return new AIFFParser();

          case 'vnd.wave':
          case 'wav':
          case 'wave':
          case 'x-wav':
            return new WavePcmParser();

          case 'x-wavpack':
            return new WavPackParser();

          case 'ape':
          case 'x-ape':
            return new APEv2Parser();
        }
        break;

      case 'video':
        switch (subType) {

          case 'ms-asf':
            return new AsfParser();

          case 'ogg':
            return new OggParser();
        }
        break;

      case 'application':
        switch (subType) {

          case 'ogg':
            return new OggParser();
        }
        break;
    }
  }

  // ToDo: expose warnings to API
  private warning: string[] = [];

}
