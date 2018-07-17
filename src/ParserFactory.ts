import {INativeAudioMetadata, IOptions} from "./";
import * as strtok3 from "strtok3";
import * as Stream from "stream";
import * as path from "path";
import * as fileType from "file-type";
import * as MimeType from "media-typer";
import {Promise} from "es6-promise";

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
      const parserName = ParserFactory.getParserIdForExtension(filePath);
      if (parserName) {
        return ParserFactory.loadParser(parserName, opts).then(parser => {
          return parser.parse(fileTokenizer, opts).then(metadata => {
            return fileTokenizer.close().then(() => {
              return metadata;
            });
          }).catch(err => {
            return fileTokenizer.close().then(() => {
              throw err;
            });
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
    let parserId = ParserFactory.getParserIdForMimeType(contentType) || ParserFactory.getParserIdForExtension(contentType);

    if (!parserId) {
      // No MIME-type mapping found
      debug("No parser found for MIME-type / extension:" + contentType);

      const buf = Buffer.alloc(4100);
      return tokenizer.peekBuffer(buf).then(() => {
        const guessedType = fileType(buf);
        if (!guessedType)
          throw new Error("Failed to guess MIME-type");
        parserId = ParserFactory.getParserIdForMimeType(guessedType.mime);
        if (!parserId)
          throw new Error("Guessed MIME-type not supported: " + guessedType.mime);
        return ParserFactory.loadParser(parserId, opts).then(parser => {
          return parser.parse(tokenizer, opts);
        });
      });
    }

    // Parser found, execute parser
    return ParserFactory.loadParser(parserId, opts).then(parser => {
      return parser.parse(tokenizer, opts);
    });
  }

  /**
   * @param filePath Path, filename or extension to audio file
   * @return Parser sub-module name
   */
  private static getParserIdForExtension(filePath: string): string {
    if (!filePath)
      return;

    const extension = path.extname(filePath).toLocaleLowerCase() || filePath;

    switch (extension) {

      case ".mp2":
      case ".mp3":
      case ".m2a":
        return 'mpeg';

      case ".ape":
        return 'apev2';

      case ".aac":
      case ".mp4":
      case ".m4a":
      case ".m4b":
      case ".m4pa":
      case ".m4v":
      case ".m4r":
      case ".3gp":
        return 'mp4';

      case ".wma":
      case ".wmv":
      case ".asf":
        return 'asf';

      case ".flac":
        return 'flac';

      case ".ogg":
      case ".ogv":
      case ".oga":
      case ".ogx":
      case ".opus": // recommended filename extension for Ogg Opus files
        return 'ogg';

      case ".aif":
      case ".aiff":
      case ".aifc":
        return 'aiff';

      case ".wav":
        return 'riff';

      case ".wv":
      case ".wvp":
        return 'wavpack';
    }
  }

  /**
   * @param {string} mimeType MIME-Type, extension, path or filename
   * @returns {string} Parser sub-module name
   */
  private static getParserIdForMimeType(mimeType: string): string {

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
            return 'mpeg'; // ToDo: handle ID1 header as well

          case 'flac':
            return 'flac';

          case 'ape':
          case 'monkeys-audio':
            return 'apev2';

          case 'mp4':
          case 'aac':
          case 'aacp':
          case 'm4a':
            return 'mp4';

          case 'ogg': // RFC 7845
            return 'ogg';

          case 'ms-wma':
          case 'ms-wmv':
          case 'ms-asf':
            return 'asf';

          case 'aiff':
          case 'aif':
          case 'aifc':
            return 'aiff';

          case 'vnd.wave':
          case 'wav':
          case 'wave':
            return 'riff';

          case 'wavpack':
            return 'wavpack';
        }
        break;

      case 'video':
        switch (subType) {

          case 'ms-asf':
          case 'ms-wmv':
            return 'asf';

          case 'ogg':
            return 'ogg';
        }
        break;

      case 'application':
        switch (subType) {

          case 'vnd.ms-asf':
            return 'asf';

          case 'ogg':
            return 'ogg';
        }
        break;
    }
  }

  private static loadParser(moduleName: string, options: IOptions): Promise<ITokenParser> {
    debug(`Lazy loading parser: ${moduleName}`);
    if (options.loadParser) {
      return options.loadParser(moduleName).then(parser => {
        if(!parser) {
          throw new Error(`options.loadParser failed to resolve module "${moduleName}".`);
        }
        return parser;
      })
    }
    const module = require('./' + moduleName);
    return Promise.resolve(new module.default());
  }

  // ToDo: expose warnings to API
  private warning: string[] = [];

}
