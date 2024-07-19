import type { ITokenizer } from 'strtok3';
import * as Token from 'token-types';

import * as util from '../common/Util.js';
import { TagType } from '../common/GenericTagTypes.js';
import { FrameParser } from './FrameParser.js';
import { ExtendedHeader, ID3v2Header, ID3v2MajorVersion, IID3v2header, UINT32SYNCSAFE } from './ID3v2Token.js';

import { ITag, IOptions } from '../type.js';
import { INativeMetadataCollector, IWarningCollector } from '../common/MetadataCollector.js';

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

const asciiDecoder = new TextDecoder('ascii');

export class ID3v2Parser {

  public static removeUnsyncBytes(buffer: Uint8Array): Uint8Array {
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
      buffer[writeI++] = buffer[readI];
    }
    return buffer.slice(0, writeI);
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

  private static readFrameFlags(b: Uint8Array): IFrameFlags {
    return {
      status: {
        tag_alter_preservation: util.getBit(b, 0, 6),
        file_alter_preservation: util.getBit(b, 0, 5),
        read_only: util.getBit(b, 0, 4)
      },
      format: {
        grouping_identity: util.getBit(b, 1, 7),
        compression: util.getBit(b, 1, 3),
        encryption: util.getBit(b, 1, 2),
        unsynchronisation: util.getBit(b, 1, 1),
        data_length_indicator: util.getBit(b, 1, 0)
      }
    };
  }

  private static readFrameData(uint8Array: Uint8Array, frameHeader: IFrameHeader, majorVer: ID3v2MajorVersion, includeCovers: boolean, warningCollector: IWarningCollector) {
    const frameParser = new FrameParser(majorVer, warningCollector);
    switch (majorVer) {
      case 2:
        return frameParser.readData(uint8Array, frameHeader.id, includeCovers);
      case 3:
      case 4:
        if (frameHeader.flags.format.unsynchronisation) {
          uint8Array = ID3v2Parser.removeUnsyncBytes(uint8Array);
        }
        if (frameHeader.flags.format.data_length_indicator) {
          uint8Array = uint8Array.slice(4, uint8Array.length);
        }
        return frameParser.readData(uint8Array, frameHeader.id, includeCovers);
      default:
        throw new Error('Unexpected majorVer: ' + majorVer);
    }
  }

  /**
   * Create a combined tag key, of tag & description
   * @param tag e.g.: COM
   * @param description e.g. iTunPGAP
   * @returns string e.g. COM:iTunPGAP
   */
  private static makeDescriptionTagName(tag: string, description: string): string {
    return tag + (description ? ':' + description : '');
  }

  private tokenizer: ITokenizer;
  private id3Header: IID3v2header;
  private metadata: INativeMetadataCollector;

  private headerType: TagType;
  private options: IOptions;

  public async parse(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions): Promise<void> {

    this.tokenizer = tokenizer;
    this.metadata = metadata;
    this.options = options;

    const id3Header = await this.tokenizer.readToken(ID3v2Header);

    if (id3Header.fileIdentifier !== 'ID3') {
      throw new Error('expected ID3-header file-identifier \'ID3\' was not found');
    }

    this.id3Header = id3Header;

    this.headerType = ('ID3v2.' + id3Header.version.major) as TagType;

    return id3Header.flags.isExtendedHeader ? this.parseExtendedHeader() : this.parseId3Data(id3Header.size);
  }

  public async parseExtendedHeader(): Promise<void> {
    const extendedHeader = await this.tokenizer.readToken(ExtendedHeader);
    const dataRemaining = extendedHeader.size - ExtendedHeader.len;
    return dataRemaining > 0 ? this.parseExtendedHeaderData(dataRemaining, extendedHeader.size) : this.parseId3Data(this.id3Header.size - extendedHeader.size);
  }

  public async parseExtendedHeaderData(dataRemaining: number, extendedHeaderSize: number): Promise<void> {
    await this.tokenizer.ignore(dataRemaining);
    return this.parseId3Data(this.id3Header.size - extendedHeaderSize);
  }

  public async parseId3Data(dataLen: number): Promise<void> {
    const uint8Array = await this.tokenizer.readToken(new Token.Uint8ArrayType(dataLen));
    for (const tag of this.parseMetadata(uint8Array)) {
      switch (tag.id) {
        case 'TXXX':
          if (tag.value) {
            await this.handleTag(tag, tag.value.text, () => tag.value.description);
          }
          break;
        default:
          await (Array.isArray(tag.value) ? Promise.all(tag.value.map(value => this.addTag(tag.id, value))) : this.addTag(tag.id, tag.value));
      }
    }
  }

  private async handleTag(tag: ITag, values: any[], descriptor: (x: any) => string, resolveValue: (x: any) => string = value => value): Promise<void> {
    await Promise.all(values.map(value =>
      this.addTag(ID3v2Parser.makeDescriptionTagName(tag.id, descriptor(value)), resolveValue(value))
    ));
  }

  private async addTag(id: string, value: any): Promise<void> {
    await this.metadata.addTag(this.headerType, id, value);
  }

  private parseMetadata(data: Uint8Array): ITag[] {
    let offset = 0;
    const tags: { id: string, value: any }[] = [];

    while (true) {
      if (offset === data.length) break;

      const frameHeaderLength = ID3v2Parser.getFrameHeaderLength(this.id3Header.version.major);

      if (offset + frameHeaderLength > data.length) {
        this.metadata.addWarning('Illegal ID3v2 tag length');
        break;
      }

      const frameHeaderBytes = data.slice(offset, offset += frameHeaderLength);
      const frameHeader = this.readFrameHeader(frameHeaderBytes, this.id3Header.version.major);

      const frameDataBytes = data.slice(offset, offset += frameHeader.length);
      const values = ID3v2Parser.readFrameData(frameDataBytes, frameHeader, this.id3Header.version.major, !this.options.skipCovers, this.metadata);
      if (values) {
        tags.push({id: frameHeader.id, value: values});
      }
    }
    return tags;
  }

  private readFrameHeader(uint8Array: Uint8Array, majorVer: number): IFrameHeader {
    let header: IFrameHeader;
    switch (majorVer) {

      case 2:
        header = {
          id: asciiDecoder.decode(uint8Array.slice(0, 3)),
          length: Token.UINT24_BE.get(uint8Array, 3)
        };
        if (!header.id.match(/[A-Z0-9]{3}/g)) {
          this.metadata.addWarning(`Invalid ID3v2.${this.id3Header.version.major} frame-header-ID: ${header.id}`);
        }
        break;

      case 3:
      case 4:
        header = {
          id: asciiDecoder.decode(uint8Array.slice(0, 4)),
          length: (majorVer === 4 ?  UINT32SYNCSAFE : Token.UINT32_BE).get(uint8Array, 4),
          flags: ID3v2Parser.readFrameFlags(uint8Array.slice(8, 10))
        };
        if (!header.id.match(/[A-Z0-9]{4}/g)) {
          this.metadata.addWarning(`Invalid ID3v2.${this.id3Header.version.major} frame-header-ID: ${header.id}`);
        }
        break;

      default:
        throw new Error('Unexpected majorVer: ' + majorVer);
    }
    return header;
  }

}
