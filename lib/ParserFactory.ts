import { fileTypeFromBuffer } from 'file-type';
import ContentType from 'content-type';
import { type MediaType, parse as mimeTypeParse } from 'media-typer';
import initDebug from 'debug';

import { type INativeMetadataCollector, MetadataCollector } from './common/MetadataCollector.js';

import type { IAudioMetadata, IOptions, ParserType } from './type.js';
import type { IRandomAccessTokenizer, ITokenizer } from 'strtok3';
import { mpegParserLoader } from './mpeg/MpegLoader.js';
import { CouldNotDetermineFileTypeError, UnsupportedFileTypeError } from './ParseError.js';
import { apeParserLoader } from './apev2/Apev2Loader.js';
import { asfParserLoader } from './asf/AsfLoader.js';
import { dsdiffParserLoader } from './dsdiff/DsdiffLoader.js';
import { aiffParserLoader } from './aiff/AiffLoader.js';
import { dsfParserLoader } from './dsf/DsfLoader.js';
import { flacParserLoader } from './flac/FlacLoader.js';
import { matroskaParserLoader } from './matroska/MatroskaLoader.js';
import { mp4ParserLoader } from './mp4/Mp4Loader.js';
import { musepackParserLoader } from './musepack/MusepackLoader.js';
import { oggParserLoader } from './ogg/OggLoader.js';
import { wavpackParserLoader } from './wavpack/WavPackLoader.js';
import { riffParserLoader } from './wav/WaveLoader.js';
import { scanAppendingHeaders } from './core.js';

const debug = initDebug('music-metadata:parser:factory');

export interface IParserLoader {
  /**
   * Returns a list of supported file extensions
   */
  extensions: string[]

  parserType: ParserType;

  /**
   * Lazy load the parser
   */
  load(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions): Promise<ITokenParser>
}

export interface ITokenParser {

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

export class ParserFactory {

  parsers: IParserLoader[] = [];

  constructor() {
    [
      flacParserLoader,
      mpegParserLoader,
      apeParserLoader,
      mp4ParserLoader,
      matroskaParserLoader,
      riffParserLoader,
      oggParserLoader,
      asfParserLoader,
      aiffParserLoader,
      wavpackParserLoader,
      musepackParserLoader,
      dsfParserLoader,
      dsdiffParserLoader
    ].forEach(parser => this.registerParser(parser));
  }

  registerParser(parser: IParserLoader): void {
    this.parsers.push(parser);
  }

  async parse(tokenizer: ITokenizer, parserLoader: IParserLoader | undefined, opts?: IOptions): Promise<IAudioMetadata> {

    if (tokenizer.supportsRandomAccess()) {
      debug('tokenizer supports random-access, scanning for appending headers');
      await scanAppendingHeaders(tokenizer as IRandomAccessTokenizer, opts);
    } else {
      debug('tokenizer does not support random-access, cannot scan for appending headers');
    }

    if (!parserLoader) {
      const buf = new Uint8Array(4100);
      if (tokenizer.fileInfo.mimeType) {
        parserLoader = this.findLoaderForType(getParserIdForMimeType(tokenizer.fileInfo.mimeType));
      }
      if (!parserLoader && tokenizer.fileInfo.path) {
        parserLoader = this.findLoaderForExtension(tokenizer.fileInfo.path);
      }
      if (!parserLoader) {
        // Parser could not be determined on MIME-type or extension
        debug('Guess parser on content...');
        await tokenizer.peekBuffer(buf, {mayBeLess: true});

        const guessedType = await fileTypeFromBuffer(buf);
        if (!guessedType || !guessedType.mime) {
          throw new CouldNotDetermineFileTypeError('Failed to determine audio format');
        }
        debug(`Guessed file type is mime=${guessedType.mime}, extension=${guessedType.ext}`);
        parserLoader = this.findLoaderForType(getParserIdForMimeType(guessedType.mime));
        if (!parserLoader) {
          throw new UnsupportedFileTypeError(`Guessed MIME-type not supported: ${guessedType.mime}`);
        }
      }
    }
    // Parser found, execute parser
    debug(`Loading ${parserLoader.parserType} parser...`);
    const metadata = new MetadataCollector(opts);
    const parser = await parserLoader.load(metadata, tokenizer, opts ?? {});
    debug(`Parser ${parserLoader.parserType} loaded`);
    await parser.parse();
    return metadata.toCommonMetadata();
  }

  /**
   * @param filePath - Path, filename or extension to audio file
   * @return Parser submodule name
   */
 findLoaderForExtension(filePath: string | undefined): IParserLoader | undefined {
    if (!filePath)
      return;

    const extension = getExtension(filePath).toLocaleLowerCase() || filePath;

    return this.parsers.find(parser => parser.extensions.indexOf(extension) !== -1);
  }

  findLoaderForType(moduleName: ParserType| undefined): IParserLoader | undefined {
    return moduleName ? this.parsers.find(parser => parser.parserType === moduleName) : undefined;
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
function getParserIdForMimeType(httpContentType: string | undefined): ParserType | undefined {

  let mime: IContentType;
  if (!httpContentType) return;
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
          return 'mpeg'; // adts

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

        case 'amr':
          return 'amr';
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
