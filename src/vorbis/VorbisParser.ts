'use strict';
import * as Vorbis from './Vorbis';
import {IFormat, INativeAudioMetadata, IOptions, ITag} from "../index";
import {Promise} from "es6-promise";
import * as Token from "token-types";
import * as Ogg from "../ogg/Ogg";
import * as _debug from "debug";

const debug = _debug("music-metadata:parser:Ogg/Vorbis1");

export interface INestedKeyTag {
  key: string,
  value: string
}

/**
 * Vorbis 1 Parser.
 * Used by OggParser
 */
export class VorbisParser implements Ogg.IAudioParser {

  protected format: IFormat = {};
  protected tags: ITag[] = [];

  private pageSegments: Buffer[] = [];

  constructor(protected options: IOptions) {
  }

  /**
   * Vorbis 1 parser
   * @param header Ogg Page Header
   * @param pageData Page data
   */
  public parsePage(header: Ogg.IPageHeader, pageData: Buffer) {
    if (header.headerType.firstPage) {
      this.parseFirstPage(header, pageData);
    } else {
      if (header.headerType.continued) {
        if (this.pageSegments.length === 0) {
          throw new Error("Cannot continue on previous page");
        }
        this.pageSegments.push(pageData);
      }
      if (header.headerType.lastPage || !header.headerType.continued) {
        // Flush page segments
        if (this.pageSegments.length > 0) {
          const fullPage = Buffer.concat(this.pageSegments);
          this.parseFullPage(fullPage);
        }
        // Reset page segments
        this.pageSegments = header.headerType.lastPage ? [] : [pageData];
      }
    }
    if (header.headerType.lastPage) {
      this.calculateDuration(header);
    }
  }

  public flush() {
    this.parseFullPage(Buffer.concat(this.pageSegments));
  }

  public getMetadata(): INativeAudioMetadata {
    return {
      format: this.format,
      native: {
        vorbis: this.tags
      }
    };
  }

  /**
   * Parse first Ogg/Vorbis page
   * @param {IPageHeader} header
   * @param {Buffer} pageData
   */
  protected parseFirstPage(header: Ogg.IPageHeader, pageData: Buffer) {
    debug("Parse first page");
    // Parse  Vorbis common header
    const commonHeader = Vorbis.CommonHeader.get(pageData, 0);
    if (commonHeader.vorbis !== 'vorbis')
      throw new Error('Metadata does not look like Vorbis');
    this.format.dataformat = "Ogg/Vorbis I";
    if (commonHeader.packetType === 1) {
      const idHeader = Vorbis.IdentificationHeader.get(pageData, Vorbis.CommonHeader.len);

      this.format.sampleRate = idHeader.sampleRate;
      this.format.bitrate = idHeader.bitrateNominal;
      this.format.numberOfChannels = idHeader.channelMode;
      debug("sample-rate=%s[hz], bitrate=%s[b/s], channel-mode=%s",  idHeader.sampleRate, idHeader.bitrateNominal, idHeader.channelMode);
    } else throw new Error('First Ogg page should be type 1: the identification header');
  }

  protected parseFullPage(pageData: Buffer) {
    // New page
    const commonHeader = Vorbis.CommonHeader.get(pageData, 0);
    debug("Parse full page: type=%s, byteLength=%s", commonHeader.packetType, pageData.byteLength);
    switch (commonHeader.packetType) {

      case 3: //  type 3: comment header
        return this.parseUserCommentList(pageData, Vorbis.CommonHeader.len);

      case 1: // type 1: the identification header
      case 5: // type 5: setup header type
        break; // ignore
    }
  }

  protected calculateDuration(header: Ogg.IPageHeader) {
    if (this.format.sampleRate && header.absoluteGranulePosition >= 0) {
      // Calculate duration
      this.format.numberOfSamples = header.absoluteGranulePosition;
      this.format.duration = this.format.numberOfSamples / this.format.sampleRate;
    }
  }

  /**
   * Ref: https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-840005.2
   * @returns {Promise<number>}
   */
  protected parseUserCommentList(pageData: Buffer, offset: number) {

    const strLen = Token.UINT32_LE.get(pageData, offset);
    offset += 4;
    const vendorString = new Token.StringType(strLen, 'utf-8').get(pageData, offset);
    offset += strLen;
    let userCommentListLength = Token.UINT32_LE.get(pageData, offset);
    offset += 4;

    while (userCommentListLength-- > 0) {
      offset += this.parseUserComment(pageData, offset);
    }
  }

  private parseUserComment(pageData: Buffer, offset: number): number {
    const strLen = Token.UINT32_LE.get(pageData, offset);
    const v = new Token.StringType(strLen, 'utf-8').get(pageData, offset + 4);
    const idx = v.indexOf('=');
    const key = v.slice(0, idx).toUpperCase();
    let value: any = v.slice(idx + 1);

    if (key === 'METADATA_BLOCK_PICTURE') {
      value = this.options.skipCovers ? null : Vorbis.VorbisPictureToken.fromBase64(value);
    }

    if (value !== null) {
      debug("Push tag: id=%s, value=%s", key, value);
      this.tags.push({id: key, value});
    }

    return Token.UINT32_LE.len + strLen;
  }
}
