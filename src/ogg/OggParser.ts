'use strict';
import common from '../common';
import ReadableStream = NodeJS.ReadableStream;
import {ITokenParser} from "../ParserFactory";
import * as strtok3 from "strtok3";
import {INativeAudioMetadata, IOptions} from "../index";
import {Readable} from "stream";
import {Promise} from "es6-promise";
import * as Token from "token-types";
import {VorbisParser} from "../vorbis/VorbisParser";

/**
 * Page header
 * Ref: https://www.xiph.org/ogg/doc/framing.html#page_header
 */
interface IOggPageHeader {
  /**
   * capture_pattern
   * A header begins with a capture pattern that simplifies identifying pages;
   * once the decoder has found the capture pattern it can do a more intensive job of verifying that it has in fact found a page boundary (as opposed to an inadvertent coincidence in the byte stream).
   */
  capturePattern: string,
  /**
   * stream_structure_version
   */
  version: number,
  /**
   * header_type_flag
   */
  headerType: {
    /**
     * True: continued packet;
     * False: fresh packet
     */
    continued: boolean,

    /**
     * True: first page of logical bitstream (bos)
     * False: not first page of logical bitstream
     */
    firstPage: boolean,

    /**
     * True: last page of logical bitstream (eos)
     * False: not last page of logical bitstream
     */
    lastPage: boolean
  },
  /**
   * The total samples encoded after including all packets finished on this page
   * The position specified in the frame header of the last page tells how long the data coded by the bitstream is.
   */
  absoluteGranulePosition: number,
  streamSerialNumber: number,
  pageSequenceNo: number,
  pageChecksum: number,
  segmentTable: number;
}

class VorbisStream extends Readable {

  private queue: Buffer[] = [];
  private waitingForData: boolean = false;

  public append(vorbisData: Buffer) {
    this.queue.push(vorbisData);
    this._tryPush();
  }

  public _read() {
    this.waitingForData = true;
    this._tryPush();
  }

  private _tryPush() {
    while (this.waitingForData) {
      const buf = this.queue.shift();
      if (buf || buf === null) { // buf === null will generate end-of-stream
        this.waitingForData = this.push(buf);
      } else break;
    }
  }
}

export class OggParser implements ITokenParser {

  public static getInstance(): OggParser {
    return new OggParser();
  }

  private static Header: Token.IGetToken<IOggPageHeader> = {
    len: 27,

    get: (buf, off): IOggPageHeader => {
      return {
        capturePattern: new Token.StringType(4, 'ascii').get(buf, off),
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
        segmentTable: buf.readUInt8(off + 26)
      };
    }
  };

  private tokenizer: strtok3.ITokenizer;

  private vorbisParser: VorbisParser;

  private header: IOggPageHeader;
  private pageNumber: number;
  private vorbisStream: VorbisStream;

  public parse(tokenizer: strtok3.ITokenizer, options: IOptions): Promise<INativeAudioMetadata> {

    this.tokenizer = tokenizer;
    this.vorbisParser = new VorbisParser();

    this.vorbisStream = new VorbisStream();
    return strtok3.fromStream(this.vorbisStream).then(vorbisTokenizer => {

      const vorbis = this.vorbisParser.parse(vorbisTokenizer, options);

      const ogg = this.parsePage()
        .catch(err => {
          if (err.message === strtok3.endOfFile) {
            this.vorbisStream.append(null);
          } else throw err;
        });

      return Promise.all<INativeAudioMetadata, void>([vorbis, ogg]).then(([metadata]) => {

        if (metadata.format.sampleRate && this.header.absoluteGranulePosition >= 0) {
          // Calculate duration
          metadata.format.duration = this.header.absoluteGranulePosition / metadata.format.sampleRate;
        }

        return metadata;
      });

    });
  }

  private parsePage(): Promise<void> {
    return this.tokenizer.readToken<IOggPageHeader>(OggParser.Header).then(header => {
      if (header.capturePattern !== 'OggS') { // Capture pattern
        throw new Error('expected ogg header but was not found');
      }
      // console.log('Ogg: Page-header: seqNo=%s, pos=%s', header.pageSequenceNo, header.absoluteGranulePosition);
      this.header = header;

      this.pageNumber = header.pageSequenceNo;

      return this.tokenizer.readToken<Buffer>(new Token.BufferType(header.segmentTable)).then(segments => {
        const pageLength = common.sum(segments as any);
        return this.tokenizer.readToken<Buffer>(new Token.BufferType(pageLength)).then(pageData => {
          this.vorbisStream.append(pageData);
          return this.parsePage();
        });
      });
    });
  }

}
