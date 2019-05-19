import {INativeAudioMetadata, IOptions, IAudioMetadata, ParserType} from "./type";
import {ITokenizer} from "strtok3/lib/type";
import * as fileType from "file-type";
import * as ContentType from "content-type";
import * as MimeType from "media-typer";

import * as _debug from "debug";
import {INativeMetadataCollector, MetadataCollector} from "./common/MetadataCollector";
import { AIFFParser } from './aiff/AiffParser';
import { APEv2Parser } from './apev2/APEv2Parser';
import { AsfParser } from './asf/AsfParser';
import { FlacParser } from './flac/FlacParser';
import { MP4Parser } from './mp4/MP4Parser';
import { MpegParser } from './mpeg/MpegParser';
import MusepackParser from './musepack';
import { OggParser } from './ogg/OggParser';
import { WaveParser } from './riff/WaveParser';
import { WavPackParser } from './wavpack/WavPackParser';
import {DsfParser} from "./dsf/DsfParser";
import {DsdiffParser} from "./dsdiff/DsdiffParser";

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

export function parseHttpContentType(contentType: string): {type: string, subtype: string, suffix?: string, parameters: { [id: string]: string; }} {
  const type = ContentType.parse(contentType);
  const mime = MimeType.parse(type.type);
  return {
    type: mime.type,
    subtype: mime.subtype,
    suffix: mime.suffix,
    parameters: type.parameters
  };
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
      debug(`Guessed file type is mime=${guessedType.mime}, extension=${guessedType.ext}`);
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
      case '.aac': // Assume it is ADTS-container
        return 'mpeg';

      case ".ape":
        return 'apev2';

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

      case '.dsf':
        return 'dsf';

      case '.dff':
        return 'dsdiff';
    }
  }

  public static async loadParser(moduleName: ParserType, options: IOptions): Promise<ITokenParser> {
    switch (moduleName) {
      case 'aiff': return new AIFFParser();
      case 'apev2': return new APEv2Parser();
      case 'asf': return new AsfParser();
      case 'dsf': return new DsfParser();
      case 'dsdiff': return new DsdiffParser();
      case 'flac': return new FlacParser();
      case 'mp4': return new MP4Parser();
      case 'mpeg': return new MpegParser();
      case 'musepack': return new MusepackParser();
      case 'ogg': return new OggParser();
      case 'riff': return new WaveParser();
      case 'wavpack': return new WavPackParser();
      default:
        throw new Error(`Unknown parser type: ${moduleName}`);
    }
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
   * @param {string} httpContentType HTTP Content-Type, extension, path or filename
   * @returns {string} Parser sub-module name
   */
  private static getParserIdForMimeType(httpContentType: string): ParserType {

    let mime;
    try {
      mime = parseHttpContentType(httpContentType);
    } catch (err) {
      debug(`Invalid HTTP Content-Type header value: ${httpContentType}`);
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

          case 'dsf':
            return 'dsf';
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
