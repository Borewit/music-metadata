import initDebug from "../../debug";

import { IdentificationHeader } from "./TheoraIdHeader";

import type { INativeMetadataCollector } from "../../common/INativeMetadataCollector";
import type { ITokenizer } from "../../strtok3";
import type { IOptions } from "../../type";
import type { IPageHeader } from "../Header";
import type { IPageConsumer } from "../PageConsumer";

const debug = initDebug("music-metadata:parser:ogg:theora");

/**
 * Ref:
 * - https://theora.org/doc/Theora.pdf
 */
export class TheoraParser implements IPageConsumer {
  constructor(private metadata: INativeMetadataCollector, options: IOptions, private tokenizer: ITokenizer) {}

  /**
   * Vorbis 1 parser
   * @param header Ogg Page Header
   * @param pageData Page data
   */
  public parsePage(header: IPageHeader, pageData: Uint8Array) {
    if (header.headerType.firstPage) {
      this.parseFirstPage(header, pageData);
    }
  }

  public flush() {
    debug("flush");
  }

  public calculateDuration(_header: IPageHeader) {
    debug("duration calculation not implemented");
  }

  /**
   * Parse first Theora Ogg page. the initial identification header packet
   * @param header
   * @param pageData
   */
  protected parseFirstPage(header: IPageHeader, pageData: Uint8Array) {
    debug("First Ogg/Theora page");
    this.metadata.setFormat("codec", "Theora");
    const idHeader = IdentificationHeader.get(pageData, 0);
    this.metadata.setFormat("bitrate", idHeader.nombr);
  }
}
