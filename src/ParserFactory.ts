import {INativeAudioMetadata, IOptions, IAudioMetadata, ParserType} from "./type";
import {ITokenizer} from "strtok3/lib/type";
import * as fileType from "file-type";
import * as MimeType from "media-typer";

import * as _debug from "debug";
import {INativeMetadataCollector, MetadataCollector} from "./common/MetadataCollector";

const debug = _debug("music-metadata:parser:factory");

export interface ITokenParser {

  /**
   * Initialize parser with output (metadata), input (tokenizer) & parsing options (options).
   * @param {INativeMetadataCollector} metadata Output
   * @param {ITokenizer} tokenizer Input
   * @param {IOptions} options Parsing options
   */
  init(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions): ITokenParser;

  /**
   * Parse audio track.
   * Called after init(...).
   * @returns {Promise<void>}
   */
  parse(): Promise<void>;
}

export class ParserFactory {

  /**
   *  Parse metadata from tokenizer
   * @param {ITokenizer} tokenizer
   * @param {string} contentType
   * @param {IOptions} opts
   * @returns {Promise<INativeAudioMetadata>}
   */
  public static async parse(tokenizer: ITokenizer, contentType: string, opts): Promise<IAudioMetadata> {

    // Resolve parser based on MIME-type or file extension
    let parserId = ParserFactory.getParserIdForMimeType(contentType) || ParserFactory.getParserIdForExtension(contentType);

    if (!parserId) {
      // No MIME-type mapping found
      debug("No parser found for MIME-type / extension: " + contentType);

      const buf = Buffer.alloc(4100);
      await tokenizer.peekBuffer(buf, 0, buf.byteLength, tokenizer.position, true);
      const guessedType = fileType(buf);
      if (!guessedType)
        throw new Error("Failed to guess MIME-type");
      parserId = ParserFactory.getParserIdForMimeType(guessedType.mime);
      if (!parserId)
        throw new Error("Guessed MIME-type not supported: " + guessedType.mime);
      return this._parse(tokenizer, parserId, opts);

    }

    // Parser found, execute parser
    return this._parse(tokenizer, parserId, opts);
  }

  /**
   * @param filePath Path, filename or extension to audio file
   * @return Parser sub-module name
   */
  public static getParserIdForExtension(filePath: string): ParserType {
    if (!filePath)
      return;

    const extension = this.getExtension(filePath).toLocaleLowerCase() || filePath;

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
      case ".ogm":
      case ".ogx":
      case ".opus": // recommended filename extension for Ogg Opus
      case ".spx": // recommended filename extension for Ogg Speex
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

      case ".mpc":
        return 'musepack';
    }
  }

  public static async loadParser(moduleName: ParserType, options: IOptions): Promise<ITokenParser> {
    debug(`Lazy loading parser: ${moduleName}`);
    if (options.loadParser) {
      const parser = await options.loadParser(moduleName);
      if (!parser) {
        throw new Error(`options.loadParser failed to resolve module "${moduleName}".`);
      }
      return parser;
    }
    const module = require('./' + moduleName + '/index');
    return new module.default();
  }

  private static async _parse(tokenizer: ITokenizer, parserId: ParserType, opts: IOptions = {}): Promise<IAudioMetadata> {
    // Parser found, execute parser
    const parser = await ParserFactory.loadParser(parserId, opts);
    const metadata = new MetadataCollector(opts);
    await parser.init(metadata, tokenizer, opts).parse();
    return metadata.toCommonMetadata();
  }

  private static getExtension(fname: string): string {
    const i = fname.lastIndexOf('.');
    return i === -1 ? '' : fname.slice(i);
  }

  /**
   * @param {string} mimeType MIME-Type, extension, path or filename
   * @returns {string} Parser sub-module name
   */
  private static getParserIdForMimeType(mimeType: string): ParserType {

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

          case 'mp3': // Incorrect MIME-type, Chrome, in Web API File object
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
          case 'opus': // RFC 6716
          case 'speex': // RFC 5574
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

          case 'musepack':
            return 'musepack';
        }
        break;

      case 'video':
        switch (subType) {

          case 'ms-asf':
          case 'ms-wmv':
            return 'asf';

          case 'm4v':
          case 'mp4':
            return 'mp4';

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

  // ToDo: expose warnings to API
  private warning: string[] = [];

}
