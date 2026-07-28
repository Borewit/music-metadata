import type { ITokenizer } from 'strtok3';
import initDebug from 'debug';

import type { IPageHeader } from '../OggToken.js';
import { VorbisStream } from '../vorbis/VorbisStream.js';
import * as Speex from './Speex.js';

import type { IOptions } from '../../type.js';
import type { INativeMetadataCollector } from '../../common/MetadataCollector.js';

const debug = initDebug('music-metadata:parser:ogg:speex');

/**
 * Speex, RFC 5574
 * Ref:
 * - https://www.speex.org/docs/manual/speex-manual/
 * - https://tools.ietf.org/html/rfc5574
 */
export class SpeexStream extends VorbisStream {

  private commentHeaderParsed = false;

  constructor(metadata: INativeMetadataCollector, options: IOptions, _tokenizer: ITokenizer) {
    super(metadata, options);
  }

  /**
   * Parse first Speex Ogg page
   * @param {IPageHeader} header
   * @param {Uint8Array} pageData
   */
  protected parseFirstPage(_header: IPageHeader, pageData: Uint8Array) {
    debug('First Ogg/Speex page');
    const speexHeader = Speex.Header.get(pageData, 0);
    this.metadata.setFormat('codec', `Speex ${speexHeader.version}`);
    this.metadata.setFormat('numberOfChannels', speexHeader.nb_channels);
    this.metadata.setFormat('sampleRate', speexHeader.rate);
    if (speexHeader.bitrate !== -1) {
      this.metadata.setFormat('bitrate', speexHeader.bitrate);
    }
    this.metadata.setAudioOnly();
  }

  /**
   * The packet following the identification header is the comment header, in
   * Vorbis comment format but without a packet type or magic signature.
   * Ref: https://tools.ietf.org/html/rfc5574#section-3
   */
  protected async parseFullPage(pageData: Uint8Array): Promise<void> {
    if (this.commentHeaderParsed) return;
    this.commentHeaderParsed = true;
    debug('Parse Ogg/Speex comment header');
    await this.parseUserCommentList(pageData, 0);
  }

}
