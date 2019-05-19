import {ITokenizer} from 'strtok3/lib/type';
import * as initDebug from 'debug';

import * as Speex from './Speex';
import {IPageHeader} from '../Ogg';
import {VorbisParser} from '../vorbis/VorbisParser';
import {IOptions} from '../../type';
import {INativeMetadataCollector} from '../../common/MetadataCollector';

const debug = initDebug('music-metadata:parser:ogg:speex');

/**
 * Speex, RFC 5574
 * Ref:
 *   https://www.speex.org/docs/manual/speex-manual/
 *   https://tools.ietf.org/html/rfc5574
 */
export class SpeexParser extends VorbisParser {

  public codecName = 'Speex';

  private lastPos: number = -1;

  constructor(metadata: INativeMetadataCollector, options: IOptions, private tokenizer: ITokenizer) {
    super(metadata, options);
  }

  /**
   * Parse first Speex Ogg page
   * @param {IPageHeader} header
   * @param {Buffer} pageData
   */
  protected parseFirstPage(header: IPageHeader, pageData: Buffer) {
    debug('First Ogg/Speex page');
    let speexHeader = Speex.Header.get(pageData, 0);
    speexHeader = speexHeader;
    this.metadata.setFormat('numberOfChannels', speexHeader.nb_channels);
    this.metadata.setFormat('sampleRate', speexHeader.rate);
    this.metadata.setFormat('codec', speexHeader.version);
    if (speexHeader.bitrate !== -1) {
      this.metadata.setFormat('bitrate', speexHeader.bitrate);
    }
  }

}
