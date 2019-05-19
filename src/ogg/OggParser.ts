import * as Token from 'token-types';
import * as initDebug from 'debug';
import * as assert from 'assert';

import common from '../common/Util';
import * as Ogg from './Ogg';
import { FourCcToken } from '../common/FourCC';
import { VorbisParser } from './vorbis/VorbisParser';
import { OpusParser } from './opus/OpusParser';
import { SpeexParser } from './speex/SpeexParser';
import { BasicParser } from '../common/BasicParser';

const debug = initDebug('music-metadata:parser:ogg');

export class SegmentTable implements Token.IGetToken<Ogg.ISegmentTable> {

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
export class OggParser extends BasicParser {

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

  private header: Ogg.IPageHeader;
  private pageNumber: number;
  private pageConsumer: Ogg.IPageConsumer;

  /**
   * Parse page
   * @returns {Promise<void>}
   */
  public async parse(): Promise<void> {
    debug('pos=%s, parsePage()', this.tokenizer.position);
    try {
      let header: Ogg.IPageHeader;
      do {
        header = await this.tokenizer.readToken<Ogg.IPageHeader>(OggParser.Header);

        assert.strictEqual(header.capturePattern, 'OggS', 'Ogg capture pattern');
        this.header = header;

        this.pageNumber = header.pageSequenceNo;
        debug('page#=%s, Ogg.id=%s', header.pageSequenceNo, header.capturePattern);

        const segmentTable = await this.tokenizer.readToken<Ogg.ISegmentTable>(new SegmentTable(header));
        debug('totalPageSize=%s', segmentTable.totalPageSize);
        const pageData = await this.tokenizer.readToken<Buffer>(new Token.BufferType(segmentTable.totalPageSize));
        debug('firstPage=%s, lastPage=%s, continued=%s', header.headerType.firstPage, header.headerType.lastPage, header.headerType.continued);
        if (header.headerType.firstPage) {
          const id = new Token.StringType(7, 'ascii').get(pageData, 0);
          switch (id) {
            case 'vorbis': // Ogg/Vorbis
              debug('Set page consumer to Ogg/Vorbis ');
              this.pageConsumer = new VorbisParser(this.metadata, this.options);
              break;
            case 'OpusHea': // Ogg/Opus
              debug('Set page consumer to Ogg/Opus');
              this.pageConsumer = new OpusParser(this.metadata, this.options, this.tokenizer);
              break;
            case 'Speex  ': // Ogg/Speex
              debug('Set page consumer to Ogg/Speex');
              this.pageConsumer = new SpeexParser(this.metadata, this.options, this.tokenizer);
              break;
            default:
              throw new Error('gg audio-codec not recognized (id=' + id + ')');
          }
          this.metadata.setFormat('container', 'Ogg/' + this.pageConsumer.codecName);
        }
        this.pageConsumer.parsePage(header, pageData);
      } while (!header.headerType.lastPage);
    } catch (err) {
      if (err.message === 'End-Of-File') {
        return; // Ignore this error
      } else if (err.message.startsWith('FourCC')) {
        if (this.pageNumber > 0) {
          // ignore this error: work-around if last OGG-page is not marked with last-page flag
          this.warnings.push('Invalid FourCC ID, maybe last OGG-page is not marked with last-page flag');
          return this.pageConsumer.flush();
        }
      }
      throw err;
    }
  }

}
