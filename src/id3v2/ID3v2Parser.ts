import {isArray} from 'util';
import common from '../common';
import {TagType} from '../tagmap';
import {ITokenizer} from "strtok3";
import {ITag, IOptions} from "../";
import * as Token from "token-types";
import FrameParser from "./FrameParser";
import {ID3v2Token, IID3v2header} from "./ID3v2";
import {INativeAudioMetadata} from "../index";

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

export class ID3v2Parser {

  public static getInstance(): ID3v2Parser {
    return new ID3v2Parser();
  }

  public static removeUnsyncBytes(buffer: Buffer): Buffer {
    let readI = 0;
    let writeI = 0;
    while (readI < buffer.length - 1) {
      if (readI !== writeI) {
        buffer[writeI] = buffer[readI];
      }
      readI += (buffer[readI] === 0xFF && buffer[readI + 1] === 0) ? 2 : 1;
      writeI++;
    }
    if (readI < buffer.length) {
      buffer[writeI++] = buffer[readI++];
    }
    return buffer.slice(0, writeI);
  }

  private static readFrameHeader(v, majorVer): IFrameHeader {
    let header: IFrameHeader;
    switch (majorVer) {

      case 2:
        header = {
          id: v.toString('ascii', 0, 3),
          length: Token.UINT24_BE.get(v, 3)
        };
        break;

      case 3:
        header = {
          id: v.toString('ascii', 0, 4),
          length: Token.UINT32_BE.get(v, 4),
          flags: ID3v2Parser.readFrameFlags(v.slice(8, 10))
        };
        break;

      case 4:
        header = {
          id: v.toString('ascii', 0, 4),
          length: ID3v2Token.UINT32SYNCSAFE.get(v, 4),
          flags: ID3v2Parser.readFrameFlags(v.slice(8, 10))
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

  private static readFrameData(buf: Buffer, frameHeader: IFrameHeader, majorVer: number, includeCovers: boolean) {
    switch (majorVer) {
      case 2:
        return FrameParser.readData(buf, frameHeader.id, majorVer, includeCovers);
      case 3:
      case 4:
        if (frameHeader.flags.format.unsynchronisation) {
          buf = ID3v2Parser.removeUnsyncBytes(buf);
        }
        if (frameHeader.flags.format.data_length_indicator) {
          buf = buf.slice(4, buf.length);
        }
        return FrameParser.readData(buf, frameHeader.id, majorVer, includeCovers);
      default:
        throw new Error('Unexpected majorVer: ' + majorVer);
    }
  }

  private tokenizer: ITokenizer;
  private id3Header: IID3v2header;

  private tags: Array<{ id: string, value: any }> = [];
  private headerType: TagType;
  private options: IOptions;

  public parse(result: INativeAudioMetadata, tokenizer: ITokenizer, options: IOptions): Promise<void> {

    this.tokenizer = tokenizer;
    this.options = options;

    return this.tokenizer.readToken(ID3v2Token.Header).then((id3Header) => {

      if (id3Header.fileIdentifier !== 'ID3') {
        throw new Error("expected file identifier 'ID3' not found");
      }

      this.id3Header = id3Header;

      this.headerType = ('ID3v2.' + id3Header.version.major) as TagType;

      if (id3Header.flags.isExtendedHeader) {
        return this.parseExtendedHeader();
      } else {
        return this.parseId3Data(id3Header.size);
      }
    }).then(() => {
      result.native[this.headerType] = this.tags;
    });
  }

  public parseExtendedHeader(): Promise<void> {
    return this.tokenizer.readToken(ID3v2Token.ExtendedHeader).then((extendedHeader) => {
      const dataRemaining = extendedHeader.size - ID3v2Token.ExtendedHeader.len;
      if (dataRemaining > 0) {
        return this.parseExtendedHeaderData(dataRemaining, extendedHeader.size);
      } else {
        return this.parseId3Data(this.id3Header.size - extendedHeader.size);
      }
    });
  }

  public parseExtendedHeaderData(dataRemaining: number, extendedHeaderSize: number): Promise<void> {
    const buffer = new Buffer(dataRemaining);
    return this.tokenizer.readBuffer(buffer, 0, dataRemaining).then(() => {
      return this.parseId3Data(this.id3Header.size - extendedHeaderSize);
    });
  }

  public parseId3Data(dataLen: number): Promise<void> {
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

      // End of ID3v2 header
      // return new MpegParser(this.tokenizer, this.id3Header.size, this.options && this.options.duration).parse().then((format) => {
    });
  }

  private parseMetadata(data: Buffer): ITag[] {
    let offset = 0;
    const tags: Array<{ id: string, value: any }> = [];

    while (true) {
      if (offset === data.length) break;

      const frameHeaderLength = ID3v2Parser.getFrameHeaderLength(this.id3Header.version.major);

      if (offset + frameHeaderLength > data.length) {
        // ToDo: generate WARNING: Illegal ID3v2-tag-length
        break;
      }

      const frameHeaderBytes = data.slice(offset, offset += frameHeaderLength);
      const frameHeader = ID3v2Parser.readFrameHeader(frameHeaderBytes, this.id3Header.version.major);

      // Last frame. Check first char is a letter, bit of defensive programming
      if (frameHeader.id === '' || frameHeader.id === '\u0000\u0000\u0000\u0000' ||
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(frameHeader.id[0]) === -1) {
        // ToDo: generate WARNING
        break;
      }

      const frameDataBytes = data.slice(offset, offset += frameHeader.length);
      const values = ID3v2Parser.readFrameData(frameDataBytes, frameHeader, this.id3Header.version.major, !this.options.skipCovers);
      tags.push({id: frameHeader.id, value: values});
    }
    return tags;
  }

}
