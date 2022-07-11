import * as Token from "../token-types";
import { EndOfStreamError } from "../strtok3";
import initDebug from "debug";

import { BasicParser } from "../common/BasicParser";

import { VorbisParser } from "./vorbis/VorbisParser";
import { OpusParser } from "./opus/OpusParser";
import { SpeexParser } from "./speex/SpeexParser";
import { TheoraParser } from "./theora/TheoraParser";

import { SegmentTable, ISegmentTable } from "./SegmentTable";
import { IPageHeader, Header } from "./Header";
import { IPageConsumer } from "./PageConsumer";

const debug = initDebug("music-metadata:parser:ogg");

/**
 * Parser for Ogg logical bitstream framing
 */
export class OggParser extends BasicParser {
  private header: IPageHeader;
  private pageNumber: number;
  private pageConsumer: IPageConsumer;

  /**
   * Parse page
   * @returns {Promise<void>}
   */
  public async parse(): Promise<void> {
    debug("pos=%s, parsePage()", this.tokenizer.position);
    try {
      let header: IPageHeader;
      do {
        header = await this.tokenizer.readToken<IPageHeader>(Header);

        if (header.capturePattern !== "OggS") throw new Error("Invalid Ogg capture pattern");
        this.metadata.setFormat("container", "Ogg");
        this.header = header;

        this.pageNumber = header.pageSequenceNo;
        debug("page#=%s, Ogg.id=%s", header.pageSequenceNo, header.capturePattern);

        const segmentTable = await this.tokenizer.readToken<ISegmentTable>(new SegmentTable(header));
        debug("totalPageSize=%s", segmentTable.totalPageSize);
        const pageData = await this.tokenizer.readToken<Uint8Array>(
          new Token.Uint8ArrayType(segmentTable.totalPageSize)
        );
        debug(
          "firstPage=%s, lastPage=%s, continued=%s",
          header.headerType.firstPage,
          header.headerType.lastPage,
          header.headerType.continued
        );
        if (header.headerType.firstPage) {
          const id = new Token.StringType(7, "ascii").get(pageData, 0);
          switch (id) {
            case "\u0001vorbis": // Ogg/Vorbis
              debug("Set page consumer to Ogg/Vorbis");
              this.pageConsumer = new VorbisParser(this.metadata, this.options);
              break;
            case "OpusHea": // Ogg/Opus
              debug("Set page consumer to Ogg/Opus");
              this.pageConsumer = new OpusParser(this.metadata, this.options, this.tokenizer);
              break;
            case "Speex  ": // Ogg/Speex
              debug("Set page consumer to Ogg/Speex");
              this.pageConsumer = new SpeexParser(this.metadata, this.options, this.tokenizer);
              break;
            case "fishead":
            case "\u0000theora": // Ogg/Theora
              debug("Set page consumer to Ogg/Theora");
              this.pageConsumer = new TheoraParser(this.metadata, this.options, this.tokenizer);
              break;
            default:
              throw new Error("gg audio-codec not recognized (id=" + id + ")");
          }
        }
        this.pageConsumer.parsePage(header, pageData);
      } while (!header.headerType.lastPage);
    } catch (error) {
      if (error instanceof EndOfStreamError) {
        this.metadata.addWarning("Last OGG-page is not marked with last-page flag");
        debug(`End-of-stream`);
        this.metadata.addWarning("Last OGG-page is not marked with last-page flag");
        if (this.header) {
          this.pageConsumer.calculateDuration(this.header);
        }
      } else if (error instanceof Error && error.message.startsWith("FourCC")) {
        if (this.pageNumber > 0) {
          // ignore this error: work-around if last OGG-page is not marked with last-page flag
          this.metadata.addWarning("Invalid FourCC ID, maybe last OGG-page is not marked with last-page flag");
          this.pageConsumer.flush();
        }
      } else {
        throw error;
      }
    }
  }
}
