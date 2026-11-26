import { parse as parseContentType } from 'content-type';
import initDebug from 'debug';
import { type MediaType, parse as mimeTypeParse } from 'media-typer';
import { type ITokenizer, isRandomAccessTokenizer } from 'strtok3';
import { aiffParserLoader } from './aiff/AiffLoader.js';
import { apeParserLoader, apeTagLoader } from './apev2/Apev2Loader.js';
import { asfParserLoader } from './asf/AsfLoader.js';
import { cafParserLoader } from './caf/CafLoader.js';
import { getMaxChapterCount, getMaxMemoryAllocation, getMaxMetadataEntries } from './common/Allocation.js';
import { detectMediaType, skipPostId3Zeros } from './common/MediaFileType.js';
import { type INativeMetadataCollector, MetadataCollector } from './common/MetadataCollector.js';
import { createAudioTrackInfo, finalizeContainerInfo } from './common/TrackInfo.js';
import { scanAppendingHeaders } from './core.js';
import { dsdiffParserLoader } from './dsdiff/DsdiffLoader.js';
import { dsfParserLoader } from './dsf/DsfLoader.js';
import { flacParserLoader } from './flac/FlacLoader.js';
import { id3v2TagLoader } from './id3v2/ID3v2Loader.js';
import { matroskaParserLoader } from './matroska/MatroskaLoader.js';
import { mp4ParserLoader } from './mp4/Mp4Loader.js';
import { mpegParserLoader } from './mpeg/MpegLoader.js';
import { musepackParserLoader } from './musepack/MusepackLoader.js';
import { oggParserLoader } from './ogg/OggLoader.js';
import { CouldNotDetermineFileTypeError } from './ParseError.js';
import { type IAudioMetadata, type IOptions, type ParserType, TrackType } from './type.js';
import { riffParserLoader } from './wav/WaveLoader.js';
import { wavpackParserLoader } from './wavpack/WavPackLoader.js';

const debug = initDebug('music-metadata:parser:factory');

export interface IParserLoader {
  /**
   * Returns a list of supported file extensions
   */
  extensions: string[];

  mimeTypes: string[];

  parserType: ParserType;
  leadingHeader?: boolean;

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
  parameters: { [id: string]: string };
}

export function parseHttpContentType(contentType: string): IContentType {
  const type = parseContentType(contentType);
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
      id3v2TagLoader,
      apeTagLoader,
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
      dsdiffParserLoader,
      cafParserLoader
    ].forEach(parser => {
      this.registerParser(parser);
    });
  }

  registerParser(parser: IParserLoader): void {
    this.parsers.push(parser);
  }

  async parse(tokenizer: ITokenizer, opts: IOptions = {}): Promise<IAudioMetadata> {
    const maxBufferSize = getMaxMemoryAllocation(opts);
    getMaxMetadataEntries(opts);
    getMaxChapterCount(opts);
    const metadata = new MetadataCollector(opts);
    let parsedHeader = false;
    while (true) {
      const detected = await detectMediaType(tokenizer, maxBufferSize);
      if (!detected && parsedHeader) {
        break;
      }
      const loader = detected?.type
        ? this.findLoaderForParserType(detected.type)
        : this.findFallbackLoader(tokenizer, detected?.fallbackType);
      if (!loader) {
        throw new CouldNotDetermineFileTypeError('Failed to determine audio format');
      }

      if (!loader.leadingHeader && loader.parserType !== 'ogg' && isRandomAccessTokenizer(tokenizer)) {
        await scanAppendingHeaders(tokenizer, opts);
      }
      const Parser = await loader.load();
      await new Parser(metadata, tokenizer, opts).parse();
      if (!loader.leadingHeader) {
        break;
      }
      parsedHeader = true;
      if (loader.parserType === 'id3v2') {
        await skipPostId3Zeros(tokenizer);
      }
    }
    // Audio-only parsers describe their single stream through the format fields.
    // Container parsers supply their own tracks; never copy aggregate fields to them.
    if (metadata.format.trackInfo.length === 0 && metadata.format.hasAudio === true) {
      metadata.addStreamInfo(createAudioTrackInfo(metadata.format));
    }
    if (metadata.format.trackInfo) {
      if (metadata.format.hasAudio === undefined) {
        metadata.setFormat('hasAudio', !!metadata.format.trackInfo.find(track => track.type === TrackType.audio));
      }
      if (metadata.format.hasVideo === undefined) {
        metadata.setFormat('hasVideo', !!metadata.format.trackInfo.find(track => track.type === TrackType.video));
      }
    }
    finalizeContainerInfo(metadata, tokenizer.fileInfo.size);
    return metadata.toCommonMetadata();
  }

  private findFallbackLoader(tokenizer: ITokenizer, fallbackType?: ParserType): IParserLoader | undefined {
    const { mimeType, path } = tokenizer.fileInfo;
    const hint = (mimeType && this.findLoaderForContentType(mimeType)) || this.findLoaderForExtension(path);
    if (hint) {
      return hint;
    }
    // Without a hint, also allow an MPEG frame after a short run of junk bytes.
    return fallbackType && this.findLoaderForParserType(fallbackType);
  }

  private findLoaderForParserType(type: IParserLoader['parserType']): IParserLoader | undefined {
    const parserType = type === 'adts' ? 'mpeg' : type;
    return this.parsers.find(loader => loader.parserType === parserType);
  }

  /**
   * @param filePath - Path, filename or extension to audio file
   * @return Parser submodule name
   */
  findLoaderForExtension(filePath: string | undefined): IParserLoader | undefined {
    if (!filePath) {
      return;
    }

    const extension = getExtension(filePath).toLocaleLowerCase() || filePath;

    return this.parsers.find(parser => parser.extensions.indexOf(extension) !== -1);
  }

  findLoaderForContentType(httpContentType: string): IParserLoader | undefined {
    let mime: IContentType;
    if (!httpContentType) {
      return;
    }
    try {
      mime = parseHttpContentType(httpContentType);
    } catch (_err) {
      debug(`Invalid HTTP Content-Type header value: ${httpContentType}`);
      return;
    }

    const subType = mime.subtype.indexOf('x-') === 0 ? mime.subtype.substring(2) : mime.subtype;

    return this.parsers.find(parser =>
      parser.mimeTypes.find(loader => loader.indexOf(`${mime.type}/${subType}`) !== -1)
    );
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
