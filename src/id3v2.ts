import ReadableStream = NodeJS.ReadableStream;
import {isArray} from 'util';
import common from './common';
import id3v2_frames from './id3v2_frames';
import {MpegParser} from './mpeg';
import {HeaderType} from './tagmap';
import {ITokenParser} from "./ParserFactory";
import {ITokenizer} from "strtok3";
import {INativeAudioMetadata, ITag} from "./";
import {IGetToken, StringType} from "token-types";
import * as Token from "token-types";
import {IOptions} from "./";

interface IFrameFlags {
  status: {
    tag_alter_preservation: boolean,
    file_alter_preservation: boolean,
    read_only: boolean
  },
  format: {
    grouping_identity: boolean,
    compression: boolean,
    encryption: boolean,
    unsynchronisation: boolean,
    data_length_indicator: boolean
  };
}
interface IFrameHeader {
  id: string,
  length?: number;
  flags?: IFrameFlags;
}

/**
 * ID3v2 tag header
 */
interface IID3v2header {
// ID3v2/file identifier   "ID3"
  fileIdentifier: string,
  // ID3v2 versionIndex
  version: {
    major: number,
    revision: number
  },
  // ID3v2 flags
  flags: {
    // Raw flags value
    raw: number,
    // Unsynchronisation
    unsynchronisation: boolean,
    // Extended header
    isExtendedHeader: boolean
    // Experimental indicator
    expIndicator: boolean,
    footer: boolean
  };
  size: number;
}

interface IExtendedHeader {
  // Extended header size
  size: number;
  extendedFlags: number;
  // Size of padding
  sizeOfPadding: number;
  // CRC data present
  crcDataPresent: boolean;
}

class ID3v2 {

  /**
   * 28 bits (representing up to 256MB) integer, the msb is 0 to avoid 'false syncsignals'.
   * 4 * %0xxxxxxx
   */
  public static UINT32SYNCSAFE = {
    get: (buf: Buffer, off: number): number => {
      return buf[off + 3] & 0x7f | ((buf[off + 2]) << 7) |
        ((buf[off + 1]) << 14) | ((buf[off]) << 21);
    },
    len: 4
  };

  /**
   * ID3v2 header
   * Ref: http://id3.org/id3v2.3.0#ID3v2_header
   * ToDo
   */
  public static Header: IGetToken<IID3v2header> = {
    len: 10,

    get: (buf, off): IID3v2header => {
      return {
        // ID3v2/file identifier   "ID3"
        fileIdentifier: new StringType(3, 'ascii').get(buf, off),
        // ID3v2 versionIndex
        version: {
          major: Token.INT8.get(buf, off + 3),
          revision: Token.INT8.get(buf, off + 4)
        },
        // ID3v2 flags
        flags: {
          // Raw flags value
          raw: Token.INT8.get(buf, off + 4),
          // Unsynchronisation
          unsynchronisation: common.strtokBITSET.get(buf, off + 5, 7),
          // Extended header
          isExtendedHeader: common.strtokBITSET.get(buf, off + 5, 6),
          // Experimental indicator
          expIndicator: common.strtokBITSET.get(buf, off + 5, 5),
          footer: common.strtokBITSET.get(buf, off + 5, 4)
        },
        size: ID3v2.UINT32SYNCSAFE.get(buf, off + 6)
      };
    }
  };

  public static ExtendedHeader: IGetToken<IExtendedHeader> = {
    len: 10,

    get: (buf, off): IExtendedHeader => {
      return {
        // Extended header size
        size: Token.UINT32_BE.get(buf, off),
        // Extended Flags
        extendedFlags: Token.UINT16_BE.get(buf, off + 4),
        // Size of padding
        sizeOfPadding: Token.UINT32_BE.get(buf, off + 6),
        // CRC data present
        crcDataPresent: common.strtokBITSET.get(buf, off + 4, 31)
      };
    }
  };
}

export class Id3v2Parser implements ITokenParser {

  public static getInstance(): Id3v2Parser {
    return new Id3v2Parser();
  }

  private static readFrameHeader(v, majorVer): IFrameHeader {
    let header: IFrameHeader;
    switch (majorVer) {

      case 2:
        header = {
          id: v.toString('ascii', 0, 3),
          length: common.strtokUINT24_BE.get(v, 3)
        };
        break;

      case 3:
        header = {
          id: v.toString('ascii', 0, 4),
          length: Token.UINT32_BE.get(v, 4),
          flags: Id3v2Parser.readFrameFlags(v.slice(8, 10))
        };
        break;

      case 4:
        header = {
          id: v.toString('ascii', 0, 4),
          length: ID3v2.UINT32SYNCSAFE.get(v, 4),
          flags: Id3v2Parser.readFrameFlags(v.slice(8, 10))
        };
        break;

      default:
        throw new Error('Unexpected majorVer: ' + majorVer);
    }
    return header;
  }

  private static getFrameHeaderLength(majorVer: number): number {
    switch (majorVer) {
      case 2:
        return 6;
      case 3:
      case 4:
        return 10;
      default:
        throw new Error('header versionIndex is incorrect');
    }
  }

  private static readFrameFlags(b: Buffer): IFrameFlags {
    return {
      status: {
        tag_alter_preservation: common.strtokBITSET.get(b, 0, 6),
        file_alter_preservation: common.strtokBITSET.get(b, 0, 5),
        read_only: common.strtokBITSET.get(b, 0, 4)
      },
      format: {
        grouping_identity: common.strtokBITSET.get(b, 1, 7),
        compression: common.strtokBITSET.get(b, 1, 3),
        encryption: common.strtokBITSET.get(b, 1, 2),
        unsynchronisation: common.strtokBITSET.get(b, 1, 1),
        data_length_indicator: common.strtokBITSET.get(b, 1, 0)
      }
    };
  }

  private tokenizer: ITokenizer;
  private id3Header: IID3v2header;

  private tags: Array<{ id: string, value: any }> = [];
  private headerType: HeaderType;
  private options: IOptions;

  public parse(tokenizer: ITokenizer, options: IOptions): Promise<INativeAudioMetadata> {

    this.tokenizer = tokenizer;
    this.options = options;

    return this.tokenizer.readToken(ID3v2.Header).then((id3Header) => {

      if (id3Header.fileIdentifier !== 'ID3') {
        throw new Error("expected file identifier 'ID3' not found");
      }

      this.id3Header = id3Header;

      this.headerType = ('id3v2.' + id3Header.version.major) as HeaderType;

      if (id3Header.flags.isExtendedHeader) {
        return this.parseExtendedHeader();
      } else {
        return this.parseId3Data(id3Header.size);
      }
    });
  }

  public parseExtendedHeader(): Promise<INativeAudioMetadata> {
    return this.tokenizer.readToken(ID3v2.ExtendedHeader).then((extendedHeader) => {
      const dataRemaining = extendedHeader.size - ID3v2.ExtendedHeader.len;
      if (dataRemaining > 0) {
        return this.parseExtendedHeaderData(dataRemaining, extendedHeader.size);
      } else {
        return this.parseId3Data(this.id3Header.size - extendedHeader.size);
      }
    });
  }

  public parseExtendedHeaderData(dataRemaining: number, extendedHeaderSize: number): Promise<INativeAudioMetadata> {
    const buffer = new Buffer(dataRemaining);
    return this.tokenizer.readBuffer(buffer, 0, dataRemaining).then(() => {
      return this.parseId3Data(this.id3Header.size - extendedHeaderSize);
    });
  }

  public parseId3Data(dataLen: number): Promise<INativeAudioMetadata> {
    const buffer = new Buffer(dataLen);
    return this.tokenizer.readBuffer(buffer, 0, dataLen).then(() => {
      for (const tag of this.parseMetadata(buffer)) {
        if (tag.id === 'TXXX') {
          for (const text of tag.value.text) {
            this.tags.push({id: tag.id + ':' + tag.value.description, value: text});
          }
        } else if (isArray(tag.value)) {
          for (const value of tag.value) {
            this.tags.push({id: tag.id, value});
          }
        } else {
          this.tags.push({id: tag.id, value: tag.value});
        }
      }

      return new MpegParser(this.tokenizer, this.id3Header.size, this.options && this.options.duration).parse().then((format) => {

        const res: INativeAudioMetadata = {
          format,
          native: {}
        };

        res.format.headerType = this.headerType;
        res.native[this.headerType] = this.tags;

        return res;
      });
    });
  }

  private parseMetadata(data: Buffer): ITag[] {
    let offset = 0;
    const tags: Array<{ id: string, value: any }> = [];

    while (true) {
      if (offset === data.length) break;
      const frameHeaderBytes = data.slice(offset, offset += Id3v2Parser.getFrameHeaderLength(this.id3Header.version.major));
      const frameHeader = Id3v2Parser.readFrameHeader(frameHeaderBytes, this.id3Header.version.major);

      // Last frame. Check first char is a letter, bit of defensive programming
      if (frameHeader.id === '' || frameHeader.id === '\u0000\u0000\u0000\u0000' ||
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(frameHeader.id[0]) === -1) {
        // ToDo: generate warning
        break;
      }

      const frameDataBytes = data.slice(offset, offset += frameHeader.length);
      const values = Id3v2Parser.readFrameData(frameDataBytes, frameHeader, this.id3Header.version.major, !this.options.skipCovers);
      tags.push({id: frameHeader.id, value: values});
    }
    return tags;
  }

  private static readFrameData(buf: Buffer, frameHeader: IFrameHeader, majorVer: number, includeCovers: boolean) {
    switch (majorVer) {
      case 2:
        return id3v2_frames.readData(buf, frameHeader.id, majorVer, includeCovers);
      case 3:
      case 4:
        if (frameHeader.flags.format.unsynchronisation) {
          buf = common.removeUnsyncBytes(buf);
        }
        if (frameHeader.flags.format.data_length_indicator) {
          buf = buf.slice(4, buf.length);
        }
        return id3v2_frames.readData(buf, frameHeader.id, majorVer, includeCovers);
      default:
        throw new Error('Unexpected majorVer: ' + majorVer);
    }
  }

}
