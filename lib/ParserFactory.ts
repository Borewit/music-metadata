import { fileTypeFromBuffer } from 'file-type';
import ContentType from 'content-type';
import {parse as mimeTypeParse, type MediaType} from 'media-typer';
import initDebug from 'debug';

import { type INativeMetadataCollector, MetadataCollector } from './common/MetadataCollector.js';
import { AIFFParser } from './aiff/AiffParser.js';
import { APEv2Parser } from './apev2/APEv2Parser.js';
import { AsfParser } from './asf/AsfParser.js';
import { FlacParser } from './flac/FlacParser.js';
import { MP4Parser } from './mp4/MP4Parser.js';
import { MpegParser } from './mpeg/MpegParser.js';
import MusepackParser from './musepack/index.js';
import { OggParser } from './ogg/OggParser.js';
import { WaveParser } from './wav/WaveParser.js';
import { WavPackParser } from './wavpack/WavPackParser.js';
import { DsfParser } from './dsf/DsfParser.js';
import { DsdiffParser } from './dsdiff/DsdiffParser.js';
import { MatroskaParser } from './matroska/MatroskaParser.js';

import type { IOptions, IAudioMetadata, ParserType } from './type.js';
import type { ITokenizer } from 'strtok3';

const debug = initDebug('music-metadata:parser:factory');

export interface ITokenParser {

  /**
   * Initialize parser with output (metadata), input (tokenizer) & parsing options (options).
   * @param metadata - Output
   * @param tokenizer - Input
   * @param options - Parsing options
   */
  init(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions): ITokenParser;

  /**
   * Parse audio track.
   * Called after init(...).
   * @returns Promise
   */
  parse(): Promise<void>;
}

interface IContentType extends MediaType {
  parameters: { [id: string]: string; };
}

export function parseHttpContentType(contentType: string): IContentType {
  const type = ContentType.parse(contentType);
  const mime = mimeTypeParse(type.type);
  return {
    type: mime.type,
    subtype: mime.subtype,
    suffix: mime.suffix,
    parameters: type.parameters
  } as IContentType;
}

/**
 * Parse metadata from tokenizer
 * @param tokenizer - Tokenizer
 * @param opts - Options
 * @returns Native metadata
 */
export async function parseOnContentType(tokenizer: ITokenizer, opts: IOptions): Promise<IAudioMetadata> {

  const { mimeType, path, url } = tokenizer.fileInfo;

  // Resolve parser based on MIME-type or file extension
  const parserId = getParserIdForMimeType(mimeType) || getParserIdForExtension(path) || getParserIdForExtension(url);

  if (!parserId) {
    debug(`No parser found for MIME-type / extension: ${mimeType}`);
  }

  return parse(tokenizer, parserId, opts);
}

export async function parse(tokenizer: ITokenizer, parserId: ParserType, opts: IOptions): Promise<IAudioMetadata> {

  let id = parserId;
  if (!id) {
    // Parser could not be determined on MIME-type or extension
    debug('Guess parser on content...');

    const buf = new Uint8Array(4100);
    await tokenizer.peekBuffer(buf, {mayBeLess: true});
    if (tokenizer.fileInfo.path) {
      id = getParserIdForExtension(tokenizer.fileInfo.path);
    }
    if (!id) {
      const guessedType = await fileTypeFromBuffer(buf);
      if (!guessedType) {
        throw new Error('Failed to determine audio format');
      }
      debug(`Guessed file type is mime=${guessedType.mime}, extension=${guessedType.ext}`);
      id = getParserIdForMimeType(guessedType.mime);
      if (!id) {
        throw new Error(`Guessed MIME-type not supported: ${guessedType.mime}`);
      }
    }
  }
  // Parser found, execute parser
  const parser = await loadParser(id);
  const metadata = new MetadataCollector(opts);
  await parser.init(metadata, tokenizer, opts).parse();
  return metadata.toCommonMetadata();
}

/**
 * @param filePath - Path, filename or extension to audio file
 * @return Parser submodule name
 */
export function getParserIdForExtension(filePath: string): ParserType {
  if (!filePath)
    return;

  const extension = getExtension(filePath).toLocaleLowerCase() || filePath;

  switch (extension) {

    case '.mp2':
    case '.mp3':
    case '.m2a':
    case '.aac': // Assume it is ADTS-container
      return 'mpeg';

    case '.ape':
      return 'apev2';

    case '.mp4':
    case '.m4a':
    case '.m4b':
    case '.m4pa':
    case '.m4v':
    case '.m4r':
    case '.3gp':
      return 'mp4';

    case '.wma':
    case '.wmv':
    case '.asf':
      return 'asf';

    case '.flac':
      return 'flac';

    case '.ogg':
    case '.ogv':
    case '.oga':
    case '.ogm':
    case '.ogx':
    case '.opus': // recommended filename extension for Ogg Opus
    case '.spx': // recommended filename extension for Ogg Speex
      return 'ogg';

    case '.aif':
    case '.aiff':
    case '.aifc':
      return 'aiff';

    case '.wav':
    case '.bwf': // Broadcast Wave Format
      return 'riff';

    case '.wv':
    case '.wvp':
      return 'wavpack';

    case '.mpc':
      return 'musepack';

    case '.dsf':
      return 'dsf';

    case '.dff':
      return 'dsdiff';

    case '.mka':
    case '.mkv':
    case '.mk3d':
    case '.mks':
    case '.webm':
      return 'matroska';
  }
}

export async function loadParser(moduleName: ParserType): Promise<ITokenParser> {
  switch (moduleName) {
    case 'aiff': return new AIFFParser();
    case 'adts':
    case 'mpeg':
      return new MpegParser();
    case 'apev2': return new APEv2Parser();
    case 'asf': return new AsfParser();
    case 'dsf': return new DsfParser();
    case 'dsdiff': return new DsdiffParser();
    case 'flac': return new FlacParser();
    case 'mp4': return new MP4Parser();
    case 'musepack': return new MusepackParser();
    case 'ogg': return new OggParser();
    case 'riff': return new WaveParser();
    case 'wavpack': return new WavPackParser();
    case 'matroska': return new MatroskaParser();
    default:
      throw new Error(`Unknown parser type: ${moduleName}`);
  }
}

function getExtension(fname: string): string {
  const i = fname.lastIndexOf('.');
  return i === -1 ? '' : fname.slice(i);
}

/**
 * @param httpContentType - HTTP Content-Type, extension, path or filename
 * @returns Parser submodule name
 */
function getParserIdForMimeType(httpContentType: string): ParserType {

  let mime: IContentType;
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
          return 'mpeg';

        case 'aac':
        case 'aacp':
          return 'adts';

        case 'flac':
          return 'flac';

        case 'ape':
        case 'monkeys-audio':
          return 'apev2';

        case 'mp4':
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

        case 'matroska':
        case 'webm':
          return 'matroska';

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

        case 'matroska':
        case 'webm':
          return 'matroska';
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
