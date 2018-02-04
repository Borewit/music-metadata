'use strict';
import * as Opus from './Opus';
import {IPageHeader} from "../ogg/Ogg";
import * as Token from "token-types";
import {VorbisParser} from "../vorbis/VorbisParser";
import {IOptions} from "../index";

/**
 * Opus parser
 * Internet Engineering Task Force (IETF) - RFC 6716
 * Used by OggParser
 */
export class OpusParser extends VorbisParser {

  private idHeader: Opus.IIdHeader;

  constructor(protected options: IOptions) {
    super(options);
  }

  /**
   * Parse first Opus Ogg page
   * @param {IPageHeader} header
   * @param {Buffer} pageData
   */
  protected parseFirstPage(header: IPageHeader, pageData: Buffer) {
    // Parse Opus ID Header
    this.idHeader = new Opus.IdHeader(pageData.length).get(pageData, 0);
    if (this.idHeader.magicSignature !== "OpusHead")
      throw new Error("Illegal ogg/Opus magic-signature");
    this.format.dataformat = "Ogg/Opus";
    this.format.sampleRate = this.idHeader.inputSampleRate;
    this.format.numberOfChannels = this.idHeader.channelCount;
  }

  protected parseFullPage(header: IPageHeader, pageData: Buffer) {
    const magicSignature = new Token.StringType(8, 'ascii').get(pageData, 0);
    switch (magicSignature) {
      case 'OpusTags':
        this.parseUserCommentList(pageData, 8);
        break;
      default:
        break;
    }
  }

  protected calculateDuration(header: IPageHeader) {
    if (this.format.sampleRate && header.absoluteGranulePosition >= 0) {
      // Calculate duration
      this.format.numberOfSamples = header.absoluteGranulePosition - this.idHeader.preSkip;
      this.format.duration = this.format.numberOfSamples / this.idHeader.inputSampleRate;
    }
  }

}
