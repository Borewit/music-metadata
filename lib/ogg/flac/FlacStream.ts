import initDebug from 'debug';
import type { ITokenizer } from 'strtok3';
import { getMaxMetadataEntries, validateAllocation } from '../../common/Allocation.js';
import { FourCcToken } from '../../common/FourCC.js';
import type { INativeMetadataCollector } from '../../common/MetadataCollector.js';
import { FlacParser } from '../../flac/FlacParser.js';
import * as Flac from '../../flac/FlacToken.js';
import { makeUnexpectedFileContentError } from '../../ParseError.js';
import type { IOptions } from '../../type.js';
import type * as Ogg from '../OggToken.js';
import { VorbisPictureToken } from '../vorbis/Vorbis.js';

class FlacContentError extends makeUnexpectedFileContentError('FLAC') {}

const debug = initDebug('music-metadata:parser:ogg:flac');

/**
 * Ref:
 * - https://xiph.org/flac/ogg_mapping.html
 */
export class FlacStream implements Ogg.IPageConsumer {
  private metadata: INativeMetadataCollector;
  private options: IOptions;
  private flacParser: FlacParser;
  protected lastPageHeader?: Ogg.IPageHeader;
  private lastGranulePosition?: number;
  public durationOnLastPage = true;
  public isMetadataComplete = false;
  private identified = false;
  private packetParts: Uint8Array[] = [];
  private packetLength = 0;

  constructor(metadata: INativeMetadataCollector, options: IOptions, tokenizer: ITokenizer) {
    this.metadata = metadata;
    this.options = options;
    this.flacParser = new FlacParser(this.metadata, tokenizer, options);
  }

  /** Assemble metadata packets using the page lacing table. */
  public async parsePage(
    header: Ogg.IPageHeader,
    pageData: Uint8Array,
    lacingValues = new Uint8Array()
  ): Promise<void> {
    this.lastPageHeader = header;
    if (header.absoluteGranulePosition >= 0) {
      this.lastGranulePosition = header.absoluteGranulePosition;
    }
    // Audio packets do not need assembling once the final metadata block was seen.
    if (this.isMetadataComplete) {
      return;
    }
    if (header.headerType.continued !== this.packetLength > 0) {
      throw new FlacContentError('Invalid Ogg/FLAC packet continuation');
    }
    if (lacingValues.reduce((sum, length) => sum + length, 0) !== pageData.length) {
      throw new FlacContentError('Ogg/FLAC lacing does not match page data');
    }
    let offset = 0;
    for (const length of lacingValues) {
      validateAllocation(this.packetLength + length, this.options);
      if (length > 0) {
        if (this.packetParts.length >= getMaxMetadataEntries(this.options)) {
          throw new FlacContentError('Buffered Ogg/FLAC segment count exceeds entry limit');
        }
        this.packetParts.push(pageData.subarray(offset, offset + length));
        this.packetLength += length;
      }
      offset += length;
      if (length < 255) {
        const packet = new Uint8Array(this.packetLength);
        let position = 0;
        for (const part of this.packetParts) {
          packet.set(part, position);
          position += part.length;
        }
        this.packetParts = [];
        this.packetLength = 0;
        await this.parsePacket(packet);
        if (this.isMetadataComplete) {
          break;
        }
      }
    }
    if (header.headerType.lastPage) {
      await this.flush();
    }
  }

  private async parsePacket(packet: Uint8Array): Promise<void> {
    if (!this.identified) {
      await this.parseFirstPage(packet);
      this.identified = true;
      return;
    }
    if (packet.length < Flac.BlockHeader.len) {
      throw new FlacContentError('Truncated Ogg/FLAC metadata header');
    }
    const header = Flac.BlockHeader.get(packet, 0);
    if (header.type === Flac.BlockType.STREAMINFO) {
      throw new FlacContentError('Unexpected repeated Ogg/FLAC STREAMINFO');
    }
    if (header.length !== packet.length - Flac.BlockHeader.len) {
      throw new FlacContentError('Ogg/FLAC metadata block length does not match packet');
    }
    await this.parseDataBlock(header, packet.subarray(Flac.BlockHeader.len));
    this.isMetadataComplete = header.lastBlock;
  }

  public calculateDuration(enfOfStream: boolean) {
    if (
      this.lastPageHeader &&
      (enfOfStream || this.lastPageHeader.headerType.lastPage) &&
      this.metadata.format.sampleRate &&
      this.lastGranulePosition !== undefined
    ) {
      // Use the last known granule position if the stream ends on an unfinished packet.
      // Ref: https://xiph.org/flac/ogg_mapping.html
      this.metadata.setFormat('numberOfSamples', this.lastGranulePosition);
      this.metadata.setFormat('duration', this.lastGranulePosition / this.metadata.format.sampleRate);
    }
  }

  private async parseFirstPage(packet: Uint8Array): Promise<void> {
    debug('First Ogg/FLAC packet');
    if (packet.length !== 13 + Flac.BlockHeader.len + Flac.BlockStreamInfo.len) {
      throw new FlacContentError('Invalid Ogg/FLAC identification packet length');
    }
    if (
      packet[0] !== 0x7f ||
      FourCcToken.get(packet, 1) !== 'FLAC' ||
      packet[5] !== 1 ||
      FourCcToken.get(packet, 9) !== 'fLaC'
    ) {
      throw new FlacContentError('Invalid Ogg/FLAC preamble or mapping version');
    }
    const header = Flac.BlockHeader.get(packet, 13);
    if (header.type !== Flac.BlockType.STREAMINFO || header.length !== Flac.BlockStreamInfo.len) {
      throw new FlacContentError('Invalid Ogg/FLAC STREAMINFO header');
    }
    await this.parseDataBlock(header, packet.subarray(17));
    this.isMetadataComplete = header.lastBlock;
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
      case Flac.BlockType.CUESHEET:
        break;
      case Flac.BlockType.VORBIS_COMMENT:
        return this.flacParser.parseComment(pageData);
      case Flac.BlockType.PICTURE:
        if (!this.options.skipCovers) {
          this.validatePicture(pageData);
          const picture = new VorbisPictureToken(pageData.length).get(pageData, 0);
          return this.flacParser.addPictureTag(picture);
        }
        break;
      default:
        this.metadata.addWarning(`Unknown block type: ${blockHeader.type}`);
    }
    // The page payload was already consumed; ignored blocks require no source I/O.
  }

  private validatePicture(data: Uint8Array): void {
    if (data.length < 32) {
      throw new FlacContentError('Truncated Ogg/FLAC picture');
    }
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const mimeLength = view.getUint32(4);
    if (mimeLength > data.length - 32) {
      throw new FlacContentError('Ogg/FLAC picture MIME length exceeds block');
    }
    const descriptionLength = view.getUint32(8 + mimeLength);
    if (descriptionLength > data.length - 32 - mimeLength) {
      throw new FlacContentError('Ogg/FLAC picture description length exceeds block');
    }
    const headerLength = 32 + mimeLength + descriptionLength;
    if (view.getUint32(headerLength - 4) !== data.length - headerLength) {
      throw new FlacContentError('Ogg/FLAC picture data length does not match block');
    }
  }

  public async flush(): Promise<void> {
    if (this.packetLength > 0 || (this.identified && !this.isMetadataComplete)) {
      throw new FlacContentError('Truncated Ogg/FLAC metadata packet');
    }
  }
}
