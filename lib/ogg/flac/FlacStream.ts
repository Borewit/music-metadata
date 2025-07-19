import type { ITokenizer } from 'strtok3';
import initDebug from 'debug';

import type * as Ogg from '../OggToken.js';
import type { IOptions } from '../../type.js';
import type { INativeMetadataCollector } from '../../common/MetadataCollector.js';
import * as Flac from '../../flac/FlacToken.js';
import { FlacParser } from '../../flac/FlacParser.js';
import { FourCcToken } from '../../common/FourCC.js';
import { VorbisPictureToken } from '../vorbis/Vorbis.js';

const debug = initDebug('music-metadata:parser:ogg:theora');

/**
 * Ref:
 * - https://xiph.org/flac/ogg_mapping.html
 */
export class FlacStream implements Ogg.IPageConsumer {

  private metadata: INativeMetadataCollector;
  private options: IOptions;
  private tokenizer: ITokenizer;
  private flacParser: FlacParser;
  public durationOnLastPage = false;

  constructor(metadata: INativeMetadataCollector, options: IOptions, tokenizer: ITokenizer) {
    this.metadata = metadata;
    this.options = options;
    this.tokenizer = tokenizer;
    this.flacParser = new FlacParser(this.metadata, this.tokenizer, options);
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
    debug('First Ogg/FLAC page');
    const fourCC = await FourCcToken.get(pageData, 9);
    if (fourCC.toString() !== 'fLaC') {
      throw new Error('Invalid FLAC preamble');
    }
    const blockHeader = await Flac.BlockHeader.get(pageData, 13);
    await this.parseDataBlock(blockHeader, pageData.subarray(13 + Flac.BlockHeader.len));
  }

  private async parseDataBlock(blockHeader: Flac.IBlockHeader, pageData: Uint8Array): Promise<void> {
    debug(`blockHeader type=${blockHeader.type}, length=${blockHeader.length}`);
    switch (blockHeader.type) {
      case Flac.BlockType.STREAMINFO: {
        const streamInfo = Flac.BlockStreamInfo.get(pageData, 0);
        return this.flacParser.processsStreamInfo(streamInfo);
      }
      case Flac.BlockType.PADDING:
        break;
      case Flac.BlockType.APPLICATION:
        break;
      case Flac.BlockType.SEEKTABLE:
        break;
      case Flac.BlockType.VORBIS_COMMENT:
        return this.flacParser.parseComment(pageData);
      case Flac.BlockType.PICTURE:
        if (!this.options.skipCovers) {
          const picture = new VorbisPictureToken(pageData.length).get(pageData, 0);
          return this.flacParser.addPictureTag(picture)
        }
        break;
      default:
        this.metadata.addWarning(`Unknown block type: ${blockHeader.type}`);
    }
    // Ignore data block
    return this.tokenizer.ignore(blockHeader.length).then();
  }

  public flush() {
    return Promise.resolve();
  }

}
