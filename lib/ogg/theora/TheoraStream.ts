import type { ITokenizer } from 'strtok3';
import initDebug from 'debug';

import type * as Ogg from '../OggToken.js';
import type { IOptions } from '../../type.js';
import type { INativeMetadataCollector } from '../../common/MetadataCollector.js';
import { IdentificationHeader } from './Theora.js';

const debug = initDebug('music-metadata:parser:ogg:theora');

/**
 * Ref:
 * - https://theora.org/doc/Theora.pdf
 */
export class TheoraStream implements Ogg.IPageConsumer {

  private metadata: INativeMetadataCollector;
  public durationOnLastPage = false;

  constructor(metadata: INativeMetadataCollector, _options: IOptions, _tokenizer: ITokenizer) {
    this.metadata = metadata;
  }

  /**
   * Vorbis 1 parser
   * @param header Ogg Page Header
   * @param pageData Page data
   */
  public async parsePage(header: Ogg.IPageHeader, pageData: Uint8Array): Promise<void> {
    if (header.headerType.firstPage) {
      await this.parseFirstPage(header, pageData);
    }
  }

  public calculateDuration() {
    debug('duration calculation not implemented');
  }

  /**
   * Parse first Theora Ogg page. the initial identification header packet
   */
  protected async parseFirstPage(_header: Ogg.IPageHeader, pageData: Uint8Array): Promise<void> {
    debug('First Ogg/Theora page');
    this.metadata.setFormat('codec', 'Theora');
    const idHeader = IdentificationHeader.get(pageData, 0);
    this.metadata.setFormat('bitrate', idHeader.nombr);
    this.metadata.setFormat('hasVideo', true);
  }

  public flush() {
    return Promise.resolve();
  }

}
