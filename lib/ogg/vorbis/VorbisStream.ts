import debugInit from 'debug';
import { getMaxMetadataEntries, validateAllocation } from '../../common/Allocation.js';
import type { INativeMetadataCollector } from '../../common/MetadataCollector.js';
import { makeUnexpectedFileContentError } from '../../ParseError.js';
import type { IOptions } from '../../type.js';
import type { IPageConsumer, IPageHeader } from '../OggToken.js';
import { CommonHeader, IdentificationHeader, type IVorbisPicture, VorbisPictureToken } from './Vorbis.js';
import { VorbisDecoder } from './VorbisDecoder.js';

const debug = debugInit('music-metadata:parser:ogg:vorbis1');

export class VorbisContentError extends makeUnexpectedFileContentError('Vorbis') {}

/**
 * Vorbis 1 Parser.
 * Used by OggStream
 */
export class VorbisStream implements IPageConsumer {
  private pageSegments: Uint8Array[] = [];
  private bufferedPageLength = 0;
  protected metadata: INativeMetadataCollector;
  protected options: IOptions;
  protected lastPageHeader?: IPageHeader;
  private readonly maxBufferedSegments: number;
  public durationOnLastPage = true;
  public isMetadataComplete = false;

  constructor(metadata: INativeMetadataCollector, options: IOptions) {
    this.metadata = metadata;
    this.options = options;
    this.maxBufferedSegments = getMaxMetadataEntries(options);
  }

  /**
   * Vorbis 1 parser
   * @param header Ogg Page Header
   * @param pageData Page data
   */
  public async parsePage(header: IPageHeader, pageData: Uint8Array): Promise<void> {
    this.lastPageHeader = header;
    if (header.headerType.firstPage) {
      this.parseFirstPage(header, pageData);
    } else {
      if (header.headerType.continued) {
        if (this.pageSegments.length === 0) {
          throw new VorbisContentError('Cannot continue on previous page');
        }
        validateAllocation(this.bufferedPageLength + pageData.length, this.options);
        if (this.pageSegments.length >= this.maxBufferedSegments) {
          throw new VorbisContentError('Buffered Ogg page count exceeds entry limit');
        }
        this.pageSegments.push(pageData);
        this.bufferedPageLength += pageData.length;
      }
      if (header.headerType.lastPage || !header.headerType.continued) {
        // Flush page segments
        if (this.pageSegments.length > 0) {
          const fullPage = this.mergeUint8Arrays(this.pageSegments);
          await this.parseFullPage(fullPage);
        }
        // Reset page segments
        this.bufferedPageLength = header.headerType.lastPage ? 0 : pageData.length;
        validateAllocation(this.bufferedPageLength, this.options);
        this.pageSegments = header.headerType.lastPage ? [] : [pageData];
      }
    }
  }

  private mergeUint8Arrays(arrays: Uint8Array[]): Uint8Array {
    const totalSize = arrays.reduce((acc, e) => acc + e.length, 0);
    validateAllocation(totalSize, this.options);
    const merged = new Uint8Array(totalSize);
    let offset = 0;
    for (const array of arrays) {
      merged.set(array, offset);
      offset += array.length;
    }
    return merged;
  }

  public async flush(): Promise<void> {
    await this.parseFullPage(this.mergeUint8Arrays(this.pageSegments));
  }

  public async parseUserComment(pageData: Uint8Array, offset: number): Promise<number> {
    const decoder = new VorbisDecoder(pageData, offset);
    const tag = decoder.parseUserComment();

    await this.addTag(tag.key, tag.value);

    return tag.len;
  }

  public async addTag(id: string, value: string | IVorbisPicture): Promise<void> {
    if (id === 'METADATA_BLOCK_PICTURE' && typeof value === 'string') {
      if (this.options.skipCovers) {
        debug('Ignore picture');
        return;
      }
      value = VorbisPictureToken.fromBase64(value);
      debug(`Push picture: id=${id}, format=${value.format}`);
    } else {
      debug(`Push tag: id=${id}, value=${value}`);
    }

    await this.metadata.addTag('vorbis', id, value);
  }

  public calculateDuration(enfOfStream: boolean) {
    if (
      this.lastPageHeader &&
      (enfOfStream || this.lastPageHeader.headerType.lastPage) &&
      this.metadata.format.sampleRate &&
      this.lastPageHeader.absoluteGranulePosition >= 0
    ) {
      // Calculate duration
      this.metadata.setFormat('numberOfSamples', this.lastPageHeader.absoluteGranulePosition);
      this.metadata.setFormat(
        'duration',
        this.lastPageHeader.absoluteGranulePosition / this.metadata.format.sampleRate
      );
    }
  }

  /**
   * Parse first Ogg/Vorbis page
   * @param _header
   * @param pageData
   */
  protected parseFirstPage(_header: IPageHeader, pageData: Uint8Array) {
    this.metadata.setFormat('codec', 'Vorbis I');
    this.metadata.setFormat('lossless', false);
    this.metadata.setFormat('hasAudio', true);
    debug('Parse first page');
    // Parse  Vorbis common header
    const commonHeader = CommonHeader.get(pageData, 0);
    if (commonHeader.vorbis !== 'vorbis') {
      throw new VorbisContentError('Metadata does not look like Vorbis');
    }
    if (commonHeader.packetType === 1) {
      const idHeader = IdentificationHeader.get(pageData, CommonHeader.len);

      this.metadata.setFormat('sampleRate', idHeader.sampleRate);
      this.metadata.setFormat('bitrate', idHeader.bitrateNominal);
      this.metadata.setFormat('numberOfChannels', idHeader.channelMode);
      debug(
        'sample-rate=%s[hz], bitrate=%s[b/s], channel-mode=%s',
        idHeader.sampleRate,
        idHeader.bitrateNominal,
        idHeader.channelMode
      );
    } else {
      throw new VorbisContentError('First Ogg page should be type 1: the identification header');
    }
  }

  protected async parseFullPage(pageData: Uint8Array): Promise<void> {
    // New page
    const commonHeader = CommonHeader.get(pageData, 0);
    debug('Parse full page: type=%s, byteLength=%s', commonHeader.packetType, pageData.byteLength);
    switch (commonHeader.packetType) {
      case 3: //  type 3: comment header
        return this.parseUserCommentList(pageData, CommonHeader.len);

      case 1: // type 1: the identification header
      case 5: // type 5: setup header type
        break; // ignore
    }
  }

  /**
   * Ref: https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-840005.2
   */
  protected async parseUserCommentList(pageData: Uint8Array, offset: number): Promise<void> {
    const { comments } = new VorbisDecoder(pageData, offset).parseCommentList(
      message => new VorbisContentError(message),
      getMaxMetadataEntries(this.options)
    );
    for (const tag of comments) {
      await this.addTag(tag.key, tag.value);
    }
    this.isMetadataComplete = true;
  }
}
