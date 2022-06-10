import * as Token from "token-types";
import { ITokenizer } from "strtok3/lib/core";

import { IPageHeader } from "../Ogg";
import { VorbisParser } from "../vorbis/VorbisParser";
import { IOptions } from "../../type";
import { INativeMetadataCollector } from "../../common/MetadataCollector";

import * as Opus from "./Opus";

/**
 * Opus parser
 * Internet Engineering Task Force (IETF) - RFC 6716
 * Used by OggParser
 */
export class OpusParser extends VorbisParser {
  private idHeader: Opus.IIdHeader;
  private lastPos: number = -1;

  constructor(
    metadata: INativeMetadataCollector,
    options: IOptions,
    private tokenizer: ITokenizer
  ) {
    super(metadata, options);
  }

  /**
   * Parse first Opus Ogg page
   * @param {IPageHeader} header
   * @param {Buffer} pageData
   */
  protected parseFirstPage(header: IPageHeader, pageData: Buffer) {
    this.metadata.setFormat("codec", "Opus");
    // Parse Opus ID Header
    this.idHeader = new Opus.IdHeader(pageData.length).get(pageData, 0);
    if (this.idHeader.magicSignature !== "OpusHead")
      throw new Error("Illegal ogg/Opus magic-signature");
    this.metadata.setFormat("sampleRate", this.idHeader.inputSampleRate);
    this.metadata.setFormat("numberOfChannels", this.idHeader.channelCount);
  }

  protected parseFullPage(pageData: Buffer) {
    const magicSignature = new Token.StringType(8, "ascii").get(pageData, 0);
    switch (magicSignature) {
      case "OpusTags":
        this.parseUserCommentList(pageData, 8);
        this.lastPos = this.tokenizer.position - pageData.length;
        break;

      default:
        break;
    }
  }

  public calculateDuration(header: IPageHeader) {
    if (
      this.metadata.format.sampleRate &&
      header.absoluteGranulePosition >= 0
    ) {
      // Calculate duration
      const pos_48bit = header.absoluteGranulePosition - this.idHeader.preSkip;
      this.metadata.setFormat("numberOfSamples", pos_48bit);
      this.metadata.setFormat("duration", pos_48bit / 48000);

      if (
        this.lastPos !== -1 &&
        this.tokenizer.fileInfo.size &&
        this.metadata.format.duration
      ) {
        const dataSize = this.tokenizer.fileInfo.size - this.lastPos;
        this.metadata.setFormat(
          "bitrate",
          (8 * dataSize) / this.metadata.format.duration
        );
      }
    }
  }
}
