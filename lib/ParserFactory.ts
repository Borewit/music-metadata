import { fileTypeFromBuffer } from 'file-type';
import ContentType from 'content-type';
import { type MediaType, parse as mimeTypeParse } from 'media-typer';
import initDebug from 'debug';

import { type INativeMetadataCollector, MetadataCollector } from './common/MetadataCollector.js';

import { type IAudioMetadata, type IOptions, type ParserType, TrackType } from './type.js';
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

  mimeTypes: string[]

  parserType: ParserType;

  /**
   * Lazy load the parser implementation class.
   */
  load(): Promise<new (metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions) => ITokenParser>;
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
    ].forEach(parser => {this.registerParser(parser)});
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
        parserLoader = this.findLoaderForContentType(tokenizer.fileInfo.mimeType);
      }
      if (!parserLoader && tokenizer.fileInfo.path) {
        parserLoader = this.findLoaderForExtension(tokenizer.fileInfo.path);
      }
      if (!parserLoader) {
        // Parser could not be determined on MIME-type or extension
        debug('Guess parser on content...');
        await tokenizer.peekBuffer(buf, {mayBeLess: true});

        const guessedType = await fileTypeFromBuffer(buf, {mpegOffsetTolerance: 10});
        if (!guessedType || !guessedType.mime) {
          throw new CouldNotDetermineFileTypeError('Failed to determine audio format');
        }
        debug(`Guessed file type is mime=${guessedType.mime}, extension=${guessedType.ext}`);
        parserLoader = this.findLoaderForContentType(guessedType.mime);
        if (!parserLoader) {
          throw new UnsupportedFileTypeError(`Guessed MIME-type not supported: ${guessedType.mime}`);
        }
      }
    }
    // Parser found, execute parser
    debug(`Loading ${parserLoader.parserType} parser...`);
    const metadata = new MetadataCollector(opts);
    const ParserImpl = await parserLoader.load();
    const parser = new ParserImpl(metadata, tokenizer, opts ?? {});
    debug(`Parser ${parserLoader.parserType} loaded`);
    await parser.parse();
    if (metadata.format.trackInfo) {
      if (metadata.format.hasAudio === undefined) {
        metadata.setFormat('hasAudio', !!metadata.format.trackInfo.find(track => track.type === TrackType.audio));
      }
      if (metadata.format.hasVideo === undefined) {
        metadata.setFormat('hasVideo', !!metadata.format.trackInfo.find(track => track.type === TrackType.video));
      }
    }
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

  findLoaderForContentType(httpContentType: string): IParserLoader | undefined {

    let mime: IContentType;
    if (!httpContentType) return;
    try {
      mime = parseHttpContentType(httpContentType);
    } catch (_err) {
      debug(`Invalid HTTP Content-Type header value: ${httpContentType}`);
      return;
    }

    const subType = mime.subtype.indexOf('x-') === 0 ? mime.subtype.substring(2) : mime.subtype;

    return this.parsers.find(parser => parser.mimeTypes.find(loader => loader.indexOf(`${mime.type}/${subType}`) !== -1));
  }

  public getSupportedMimeTypes(): string[] {
    const mimeTypeSet = new Set<string>();
    this.parsers.forEach(loader => {
      loader.mimeTypes.forEach(mimeType => {
        mimeTypeSet.add(mimeType);
        mimeTypeSet.add(mimeType.replace('/', '/x-'));
      });
    });
    return Array.from(mimeTypeSet);
  }
}

function getExtension(fname: string): string {
  const i = fname.lastIndexOf('.');
  return i === -1 ? '' : fname.substring(i);
}
