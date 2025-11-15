import * as Token from 'token-types';
import { EndOfStreamError, type ITokenizer } from 'strtok3';
import initDebug from 'debug';

import { BasicParser } from '../common/BasicParser.js';

import { VorbisStream } from './vorbis/VorbisStream.js';
import { OpusStream } from './opus/OpusStream.js';
import { SpeexStream } from './speex/SpeexStream.js';
import { TheoraStream } from './theora/TheoraStream.js';

import type * as Ogg from './OggToken.js';
import { makeUnexpectedFileContentError } from '../ParseError.js';
import { type IPageConsumer, type IPageHeader, PageHeader, SegmentTable } from './OggToken.js';
import type { INativeMetadataCollector } from '../common/MetadataCollector.js';
import type { IOptions } from '../type.js';
import { FlacStream } from './flac/FlacStream.js';

export class OggContentError extends makeUnexpectedFileContentError('Ogg'){
}

const debug = initDebug('music-metadata:parser:ogg');

class OggStream {

  private metadata: INativeMetadataCollector;
  public streamSerial: number;
  public pageNumber = 0;
  public closed = false;
  private options: IOptions;
  public pageConsumer?: IPageConsumer;

  constructor(metadata: INativeMetadataCollector, streamSerial: number, options: IOptions) {
    this.metadata = metadata;
    this.streamSerial = streamSerial;
    this.options = options;
  }

  public async parsePage(tokenizer: ITokenizer, header: IPageHeader) {

    this.pageNumber = header.pageSequenceNo;
    debug('serial=%s page#=%s, Ogg.id=%s', header.streamSerialNumber, header.pageSequenceNo, header.capturePattern);

    const segmentTable = await tokenizer.readToken<Ogg.ISegmentTable>(new SegmentTable(header));
    debug('totalPageSize=%s', segmentTable.totalPageSize);
    const pageData = await tokenizer.readToken<Uint8Array>(new Token.Uint8ArrayType(segmentTable.totalPageSize));
    debug('firstPage=%s, lastPage=%s, continued=%s', header.headerType.firstPage, header.headerType.lastPage, header.headerType.continued);

    if (header.headerType.firstPage) {
      this.metadata.setFormat('container', 'Ogg');
      const idData = pageData.subarray(0, 7); // Copy this portion
      const asciiId = Array.from(idData)
        .filter(b => b >= 32 && b <= 126) // Keep only printable ASCII
        .map(b => String.fromCharCode(b))
        .join('');
      switch (asciiId) {
        case 'vorbis': // Ogg/Vorbis
          debug(`Set Ogg stream serial ${header.streamSerialNumber}, codec=Vorbis`);
          this.pageConsumer = new VorbisStream(this.metadata, this.options);
          break;
        case 'OpusHea': // Ogg/Opus
          debug('Set page consumer to Ogg/Opus');
          this.pageConsumer = new OpusStream(this.metadata, this.options, tokenizer);
          break;
        case 'Speex  ': // Ogg/Speex
          debug('Set page consumer to Ogg/Speex');
          this.pageConsumer = new SpeexStream(this.metadata, this.options, tokenizer);
          break;
        case 'fishead':
        case 'theora': // Ogg/Theora
          debug('Set page consumer to Ogg/Theora');
          this.pageConsumer = new TheoraStream(this.metadata, this.options, tokenizer);
          break;
        case 'FLAC': // Ogg/Theora
          debug('Set page consumer to Vorbis');
          this.pageConsumer = new FlacStream(this.metadata, this.options, tokenizer);
          break;
        default:
          throw new OggContentError(`Ogg codec not recognized (id=${asciiId}`);
      }
    }

    if (header.headerType.lastPage) {
      this.closed = true;
    }

    if (this.pageConsumer) {
      await this.pageConsumer.parsePage(header, pageData);
    } else throw new Error('pageConsumer should be initialized');
  }
}

/**
 * Parser for Ogg logical bitstream framing
 */
export class OggParser extends BasicParser {

  private streams = new Map<number, OggStream>();

  /**
   * Parse page
   * @returns {Promise<void>}
   */
  public async parse(): Promise<void> {
    this.streams = new Map<number, OggStream>();
    let enfOfStream = false;

    let header: IPageHeader;
    try {
      do {
        header = await this.tokenizer.readToken<IPageHeader>(PageHeader);

        if (header.capturePattern !== 'OggS') throw new OggContentError('Invalid Ogg capture pattern');

        let stream = this.streams.get(header.streamSerialNumber);
        if (!stream) {
          stream = new OggStream(this.metadata, header.streamSerialNumber, this.options);
          this.streams.set(header.streamSerialNumber, stream);
        }
        await stream.parsePage(this.tokenizer, header);

        if (stream.pageNumber > 12 && !(this.options.duration && [...this.streams.values()].find(stream => stream.pageConsumer?.durationOnLastPage)) ) {
          debug("Stop processing Ogg stream");
          break;
        }

      } while (![...this.streams.values()].every(item => item.closed));
    } catch(err) {
      if (err instanceof EndOfStreamError) {
        debug("Reached end-of-stream");
        enfOfStream = true;
      } else if (err instanceof OggContentError) {
        this.metadata.addWarning(`Corrupt Ogg content at ${this.tokenizer.position}`);
      } else throw err;
    }
    for (const stream of this.streams.values()) {
      if (!stream.closed) {
        this.metadata.addWarning(`End-of-stream reached before reaching last page in Ogg stream serial=${stream.streamSerial}`);
        await stream.pageConsumer?.flush();
      }
      stream.pageConsumer?.calculateDuration(enfOfStream);
    }
  }
}
