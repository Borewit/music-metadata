'use strict';
import common from './common';
import vorbis from './vorbis';
import ReadableStream = NodeJS.ReadableStream;
import {ITokenParser} from "./ParserFactory";
import {ITokenizer} from "strtok3";
import {IFormat, INativeAudioMetadata, IOptions, ITag} from "./index";
import {Readable} from "stream";
import {Promise} from "es6-promise";
import {ReadStreamTokenizer} from "strtok3";
import {StreamReader} from "then-read-stream";
import * as Token from "token-types";

/**
 * Page header
 * Ref: https://www.xiph.org/ogg/doc/framing.html#page_header
 */
interface IOggPageHeader {
  /**
   * capture_pattern
   * A header begins with a capture pattern that simplifies identifying pages; once the decoder has found the capture pattern it can do a more intensive job of verifying that it has in fact found a page boundary (as opposed to an inadvertent coincidence in the byte stream).
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

interface IFormatInfo {
  version: number,
  channelMode: number,
  sampleRate: number,
  bitrateMax: number,
  bitrateNominal: number,
  bitrateMin: number
}

/**
 * Comment header interface
 * Ref: https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-620004.2.1
 */
interface ICommonHeader {
  /**
   * Packet Type
   */
  packetType: number,
  /**
   * Should be 'vorbis'
   */
  vorbis: string
}

/**
 * Vorbis 1 decoding tokens
 * Ref: https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-620004.2.1
 */
class Vorbis {

  /**
   * Comment header decoder
   * Ref: https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-620004.2.1
   */
  public static CommonHeader: Token.IGetToken<ICommonHeader> = {
    len: 7,

    get: (buf, off): ICommonHeader => {
      console.log("vorbis: %s", buf.slice(off, off + 7).toString("ascii"));
      return {
        packetType: buf.readUInt8(off),
        vorbis: new Token.StringType(6, 'ascii').get(buf, off + 1)
      };
    }
  };

  /**
   * Identification header
   * Ref: https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-630004.2.2
   * @type {{len: number; get: ((buf, off)=>IFormatInfo)}}
   */
  public static IdentificationHeader: Token.IGetToken<IFormatInfo> = {
    len: 23,

    get: (buf, off): IFormatInfo => {
      return {
        version: buf.readUInt32LE(off + 0),
        channelMode: buf.readUInt8(off + 4),
        sampleRate: buf.readUInt32LE(off + 5),
        bitrateMax: buf.readUInt32LE(off + 9),
        bitrateNominal: buf.readUInt32LE(off + 13),
        bitrateMin: buf.readUInt32LE(off + 17)
      };
    }
  };
}

/**
 * Vorbis 1 Parser.
 * Used by OggParser
 */
class VorbisParser implements ITokenParser {

  private format: IFormat = {
    headerType: 'vorbis'
  };

  private tags: ITag[] = [];

  private tokenizer: ITokenizer;

  public parse(tokenizer: ITokenizer, options: IOptions): Promise<INativeAudioMetadata> {

    this.tokenizer = tokenizer;

    return this.parseHeaderPacket().then(() => {
      return {
        format: this.format,
        native: {
          vorbis: this.tags
        }
      };
    });
  }

  /**
   * Vorbis 1 parser
   * @param pageLength
   * @returns {Promise<void>}
   */
  private parseHeaderPacket(): Promise<boolean> {

    console.log("Vorbis: read common header");
    return this.tokenizer.readToken<ICommonHeader>(Vorbis.CommonHeader).then((header) => {
      if (header.vorbis !== 'vorbis')
        throw new Error('Metadata does not look like Vorbis');

      console.log("Vorbis: parsePacket");
      return this.parsePacket(header.packetType).then((res) => {
        if (!res.done) {
          return this.parseHeaderPacket();
        }
        return res.done;
      });
    }).catch((err) => {
      if (err === StreamReader.EndOfStream) {
        return true;
      } else
        throw err;
    });
  }

  private parsePacket(packetType: number): Promise<{ len: number, done: boolean }> {
    switch (packetType) {

      case 1: //  type 1: the identification header
        console.log("Vorbis: parseVorbisInfo");
        return this.parseVorbisInfo().then((len) => {
          return {len, done: false};
        });

      case 3: //  type 3: comment header
        console.log("Vorbis: parseUserCommentList");
        return this.parseUserCommentList().then((len) => {
          return {len, done: true};
        });

      case 5: // type 5: setup header type
        throw new Error("'setup header type' not implemented");
    }
  }

  private parseVorbisInfo(): Promise<number> {
    return this.tokenizer.readToken<IFormatInfo>(Vorbis.IdentificationHeader).then((vi) => {
      this.format.sampleRate = vi.sampleRate;
      this.format.bitrate = vi.bitrateNominal;
      this.format.numberOfChannels = vi.channelMode;
      return Vorbis.IdentificationHeader.len;
    });
  }

  /**
   * Ref: https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-840005.2
   * @returns {Promise<number>}
   */
  private parseUserCommentList(): Promise<number> {

    return this.tokenizer.readToken<number>(Token.UINT32_LE).then((strLen) => {
      return this.tokenizer.readToken<string>(new Token.StringType(strLen, 'utf-8')).then((vendorString: string) => {
        return this.tokenizer.readToken<number>(Token.UINT32_LE).then((userCommentListLength) => {
          return this.parseUserComment(userCommentListLength).then((len) => {
            return 2 * Token.UINT32_LE.len + strLen + len;
          });
        });
      });
    });
  }

  private parseUserComment(userCommentListLength: number): Promise<number> {
    return this.tokenizer.readToken<number>(Token.UINT32_LE).then((strLen) => {
      return this.tokenizer.readToken<string>(new Token.StringType(strLen, 'ascii')).then((v) => {
        const idx = v.indexOf('=');
        const key = v.slice(0, idx).toUpperCase();
        let value: any = v.slice(idx + 1);

        if (key === 'METADATA_BLOCK_PICTURE') {
          value = vorbis.readPicture(new Buffer(value, 'base64'));
        }

        this.tags.push({id: key, value});

        const len = Token.UINT32_LE.len + strLen;
        if (--userCommentListLength > 0) {
          // if we don't want to read the duration
          // then tell the parent stream to stop
          // stop = !readDuration;
          return this.parseUserComment(userCommentListLength).then((recLen) => {
            return len + recLen;
          });
        }
        return strLen;
      });
    });
  }
}

class VorbisStream extends Readable {

  private queue: Buffer[] = [];
  private waitingForData: boolean = false;

  public append(vorbisData: Buffer) {
    this.queue.push(vorbisData);
    this._tryPush();
  }

  private _tryPush() {
    while (this.waitingForData) {
      const buf = this.queue.shift();
      if (buf) {
        this.waitingForData = this.push(buf);
      } else break;
    }
  }

  public _read() {
    this.waitingForData = true;
    this._tryPush();
  }
}

export class OggParser implements ITokenParser {

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
        //packet_flag: buf.readUInt8(off + 5),
        absoluteGranulePosition: (buf.readUInt32LE(off + 10) << 32) + buf.readUInt32LE(off + 6),
        streamSerialNumber: Token.UINT32_LE.get(buf, off + 14),
        pageSequenceNo: Token.UINT32_LE.get(buf, off + 18),
        pageChecksum: Token.UINT32_LE.get(buf, off + 22),
        segmentTable: buf.readUInt8(off + 26)
      };
    }
  };

  public static getInstance(): OggParser {
    return new OggParser();
  }

  private tokenizer: ITokenizer;

  private vorbisParser: VorbisParser;

  private header: IOggPageHeader;
  private pageNumber: number;
  private vorbisStream: VorbisStream;

  public parse(tokenizer: ITokenizer, options: IOptions): Promise<INativeAudioMetadata> {

    this.tokenizer = tokenizer;
    this.vorbisParser = new VorbisParser();

    this.vorbisStream = new VorbisStream();
    const vorbisTokenizer = new ReadStreamTokenizer(this.vorbisStream);

    // ToDo: should be provided with level-2 tokenizer
    const vorbis = this.vorbisParser.parse(vorbisTokenizer, options).then((metadata) => {

      if (metadata.format.sampleRate) {
        // Calculate duration
        metadata.format.duration = this.header.absoluteGranulePosition / metadata.format.sampleRate;
      }

      return metadata;
    });

    const ogg = this.parsePage().catch((err) => {
      if (err === StreamReader.EndOfStream) {
        console.log("EndOfStream: ogg");
        this.vorbisStream.append(null);
      } else throw err;
    });

    return Promise.all<[void, void]>([vorbis, ogg]).then((res) => {
      return res[0];
    }).catch((err) => {
      err = err; // ToDo
    });
  }

  private parsePage(): Promise<void> {
    return this.tokenizer.readToken<IOggPageHeader>(OggParser.Header).then((header) => {
      if (header.capturePattern !== 'OggS') { // Capture pattern
        throw new Error('expected ogg header but was not found');
      }
      this.header = header;

      this.pageNumber = header.pageSequenceNo;

      return this.tokenizer.readToken<Buffer>(new Token.BufferType(header.segmentTable)).then((segments) => {
        const pageLength = common.sum(segments as any);
        return this.tokenizer.readToken<Buffer>(new Token.BufferType(pageLength)).then((pageData) => {
          console.log("Send ogg-page %s", header.pageSequenceNo);
          this.vorbisStream.append(pageData);
          return this.parsePage();
        });
      });
    });
  }

}
