import { Latin1StringType } from "../../token-types/string";
import { VorbisParser } from "../vorbis/VorbisParser";

import { IIdHeader, IdHeader } from "./OpusIdHeader";

import type { INativeMetadataCollector } from "../../common/INativeMetadataCollector";
import type { ITokenizer } from "../../strtok3";
import type { IOptions } from "../../type";
import type { IPageHeader } from "../Header";



/**
 * Opus parser
 * Internet Engineering Task Force (IETF) - RFC 6716
 * Used by OggParser
 */
export class OpusParser extends VorbisParser {
  private idHeader: IIdHeader;
  private lastPos = -1;

  constructor(metadata: INativeMetadataCollector, options: IOptions, private tokenizer: ITokenizer) {
    super(metadata, options);
  }

  /**
   * Parse first Opus Ogg page
   * @param header
   * @param pageData
   */
  protected override parseFirstPage(header: IPageHeader, pageData: Uint8Array) {
    this.metadata.setFormat("codec", "Opus");
    // Parse Opus ID Header
    this.idHeader = new IdHeader(pageData.length).get(pageData, 0);
    if (this.idHeader.magicSignature !== "OpusHead") throw new Error("Illegal ogg/Opus magic-signature");
    this.metadata.setFormat("sampleRate", this.idHeader.inputSampleRate);
    this.metadata.setFormat("numberOfChannels", this.idHeader.channelCount);
  }

  protected override parseFullPage(pageData: Uint8Array) {
    const magicSignature = new Latin1StringType(8).get(pageData, 0);
    switch (magicSignature) {
      case "OpusTags":
        this.parseUserCommentList(pageData, 8);
        this.lastPos = this.tokenizer.position - pageData.length;
        break;

      default:
        break;
    }
  }

  public override calculateDuration(header: IPageHeader) {
    if (this.metadata.format.sampleRate && header.absoluteGranulePosition >= 0) {
      // Calculate duration
      const pos_48bit = header.absoluteGranulePosition - this.idHeader.preSkip;
      this.metadata.setFormat("numberOfSamples", pos_48bit);
      this.metadata.setFormat("duration", pos_48bit / 48_000);

      if (this.lastPos !== -1 && this.tokenizer.fileInfo.size > 0 && this.metadata.format.duration) {
        const dataSize = this.tokenizer.fileInfo.size - this.lastPos;
        this.metadata.setFormat("bitrate", (8 * dataSize) / this.metadata.format.duration);
      }
    }
  }
}
