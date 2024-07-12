import { ITokenizer } from 'strtok3';
import initDebug from 'debug';

import * as Ogg from '../Ogg.js';
import { IOptions } from '../../type.js';
import { INativeMetadataCollector } from '../../common/MetadataCollector.js';
import { IdentificationHeader } from './Theora.js';

const debug = initDebug('music-metadata:parser:ogg:theora');

/**
 * Ref:
 * - https://theora.org/doc/Theora.pdf
 */
export class TheoraParser implements Ogg.IPageConsumer {

  constructor(private metadata: INativeMetadataCollector, options: IOptions, private tokenizer: ITokenizer) {
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

  public async flush(): Promise<void> {
    debug('flush');
  }

  public calculateDuration(header: Ogg.IPageHeader) {
    debug('duration calculation not implemented');
  }

  /**
   * Parse first Theora Ogg page. the initial identification header packet
   * @param {IPageHeader} header
   * @param {Buffer} pageData
   */
  protected async parseFirstPage(header: Ogg.IPageHeader, pageData: Uint8Array): Promise<void> {
    debug('First Ogg/Theora page');
    this.metadata.setFormat('codec', 'Theora');
    const idHeader = IdentificationHeader.get(pageData, 0);
    this.metadata.setFormat('bitrate', idHeader.nombr);
  }

}
