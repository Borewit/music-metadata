'use strict';
import common from "../common/Util";
import {ITokenParser} from "../ParserFactory";
import * as strtok3 from "strtok3";
import {INativeAudioMetadata, IOptions} from "../index";
import {Promise} from "es6-promise";
import {VorbisParser} from "../vorbis/VorbisParser";
import {FourCcToken} from "../common/FourCC";
import * as Ogg from "./Ogg";
import {OpusParser} from "../opus/OpusParser";
import * as Token from "token-types";
import * as _debug from "debug";

const debug = _debug("music-metadata/ogg");

export class SegmentTable implements  Token.IGetToken<Ogg.ISegmentTable> {

  private static sum(buf: number[], off: number, len: number): number {
    let s: number = 0;
    for (let i = off; i < off + len; ++i) {
      s += buf[i];
    }
    return s;
  }

  public len: number;

  constructor(header: Ogg.IPageHeader) {
    this.len = header.page_segments;
  }

  public get(buf, off): Ogg.ISegmentTable {
    return {
      totalPageSize: SegmentTable.sum(buf, off, this.len)
    };
  }

}

/**
 * Parser for Ogg logical bitstream framing
 */
export class OggParser implements ITokenParser {

  public static getInstance(): OggParser {
    return new OggParser();
  }

  private static Header: Token.IGetToken<Ogg.IPageHeader> = {
    len: 27,

    get: (buf, off): Ogg.IPageHeader => {
      return {
        capturePattern: FourCcToken.get(buf, off),
        version: buf.readUInt8(off + 4),

        headerType: {
          continued: common.strtokBITSET.get(buf, off + 5, 0),
          firstPage: common.strtokBITSET.get(buf, off + 5, 1),
          lastPage: common.strtokBITSET.get(buf, off + 5, 2)
        },
        // packet_flag: buf.readUInt8(off + 5),
        absoluteGranulePosition: buf.readIntLE(off + 6, 6), // cannot read 2 of 8 most significant bytes
        streamSerialNumber: Token.UINT32_LE.get(buf, off + 14),
        pageSequenceNo: Token.UINT32_LE.get(buf, off + 18),
        pageChecksum: Token.UINT32_LE.get(buf, off + 22),
        page_segments: buf.readUInt8(off + 26)
      };
    }
  };

  private tokenizer: strtok3.ITokenizer;

  private header: Ogg.IPageHeader;
  private pageNumber: number;
  private pageConsumer: Ogg.IAudioParser;
  private options: IOptions;

  public parse(tokenizer: strtok3.ITokenizer, options: IOptions): Promise<INativeAudioMetadata> {

    this.tokenizer = tokenizer;
    this.options = options;

    return this.parsePage().then(() => {

      if (this.pageConsumer) {
        return this.pageConsumer.getMetadata();
      }
      return null;
    });
  }

  private parsePage(): Promise<void> {
    debug("pos=%s, parsePage()", this.tokenizer.position);
    return this.tokenizer.readToken<Ogg.IPageHeader>(OggParser.Header).then(header => {
      if (header.capturePattern !== 'OggS') { // Capture pattern
        throw new Error('expected ogg header but was not found');
      }
      this.header = header;

      this.pageNumber = header.pageSequenceNo;
      debug("page#=%s, Ogg.id=%s", header.pageSequenceNo, header.capturePattern);

      return this.tokenizer.readToken<Ogg.ISegmentTable>(new SegmentTable(header)).then(segmentTable => {
        debug("totalPageSize=%s", segmentTable.totalPageSize);
        return this.tokenizer.readToken<Buffer>(new Token.BufferType(segmentTable.totalPageSize)).then(pageData => {
          debug("firstPage=%s, lastPage=%s, continued=%s", header.headerType.firstPage, header.headerType.lastPage, header.headerType.continued);
          if (header.headerType.firstPage) {
            const id = new Token.StringType(7, 'ascii').get(pageData, 0);
            switch (id[1]) {
              case 'v': // Ogg/Vorbis
                debug("Set page consumer to Ogg/Vorbis ");
                this.pageConsumer = new VorbisParser(this.options);
                break;
              case 'p': // Ogg/Opus
                debug("Set page consumer to Ogg/Opus");
                this.pageConsumer = new OpusParser(this.options);
                break;
              default:
                throw new Error('gg audio-codec not recognized (id=' + id + ')');
            }
          }
          this.pageConsumer.parsePage(header, pageData);
          if (!header.headerType.lastPage) {
            return this.parsePage();
          }
        });
      });
    }).catch (err => {
      switch (err.message) {
        case "End-Of-File":
          break; // ignore this error

        case "FourCC contains invalid characters":
          if (this.pageNumber > 0) {
            // ignore this error: work-around if last OGG-page is not marked with last-page flag
            // ToDo: capture warning
            return this.pageConsumer.flush();
          }
          throw err;

        default:
          throw err;
      }
    });
  }

}
