import { extendedHeaderSize } from "../parse-unit/id3v2/extended-header-size";
import { frameHeader as id3v2FrameHeader, ID3v2FrameHeader } from "../parse-unit/id3v2/frame-header";
import { header as id3v2Header, Id3v2header, ID3v2MajorVersion } from "../parse-unit/id3v2/header";
import { bytes } from "../parse-unit/primitive/bytes";
import { readUnitFromBuffer, readUnitFromTokenizer } from "../parse-unit/utility/read-unit";

import { FrameParser } from "./FrameParser";

import type { TagType } from "../common/GenericTagTypes";
import type { INativeMetadataCollector, IWarningCollector } from "../common/INativeMetadataCollector";
import type { ITokenizer } from "../strtok3/types";
import type { ITag, IOptions } from "../type";

export class ID3v2Parser {
  public static removeUnsyncBytes(buffer: Uint8Array): Uint8Array {
    let readI = 0;
    let writeI = 0;
    while (readI < buffer.length - 1) {
      if (readI !== writeI) {
        buffer[writeI] = buffer[readI];
      }
      readI += buffer[readI] === 0xff && buffer[readI + 1] === 0 ? 2 : 1;
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
        throw new Error("header versionIndex is incorrect");
    }
  }

  private static readFrameData(
    uint8Array: Uint8Array,
    frameHeader: ID3v2FrameHeader,
    majorVer: ID3v2MajorVersion,
    includeCovers: boolean,
    warningCollector: IWarningCollector
  ) {
    const frameParser = new FrameParser(majorVer, warningCollector);
    switch (majorVer) {
      case 2:
        return frameParser.readData(uint8Array, frameHeader.id, includeCovers);
      case 3:
      case 4:
        if (frameHeader.flags.format.unsynchronisation) {
          uint8Array = ID3v2Parser.removeUnsyncBytes(uint8Array);
        }
        if (frameHeader.flags.format.dataLengthIndicator) {
          uint8Array = uint8Array.slice(4, uint8Array.length);
        }
        return frameParser.readData(uint8Array, frameHeader.id, includeCovers);
      default:
        throw new Error(`Unexpected majorVer: ${majorVer as unknown as string}`);
    }
  }

  /**
   * Create a combined tag key, of tag & description
   * @param tag e.g.: COM
   * @param description e.g. iTunPGAP
   * @returns string e.g. COM:iTunPGAP
   */
  private static makeDescriptionTagName(tag: string, description: string): string {
    return tag + (description ? ":" + description : "");
  }

  private tokenizer: ITokenizer;
  private id3Header: Id3v2header;
  private metadata: INativeMetadataCollector;

  private headerType: TagType;
  private options: IOptions;

  public async parse(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions): Promise<void> {
    this.tokenizer = tokenizer;
    this.metadata = metadata;
    this.options = options;

    const id3Header = await readUnitFromTokenizer(this.tokenizer, id3v2Header);

    if (id3Header.fileIdentifier !== "ID3") {
      throw new Error("expected ID3-header file-identifier 'ID3' was not found");
    }

    this.id3Header = id3Header;

    this.headerType = `ID3v2.${id3Header.major}` as TagType;

    return id3Header.flags.isExtendedHeader ? this.parseExtendedHeader() : this.parseId3Data(id3Header.size);
  }

  public async parseExtendedHeader(): Promise<void> {
    const unit = extendedHeaderSize(this.id3Header.major);
    const extendedHeader = await readUnitFromTokenizer(this.tokenizer, unit);
    const dataRemaining = extendedHeader - unit[0];
    if (dataRemaining > 0) await this.tokenizer.ignore(dataRemaining);
    return this.parseId3Data(this.id3Header.size - extendedHeader);
  }

  public async parseId3Data(dataLen: number): Promise<void> {
    const uint8Array = await readUnitFromTokenizer(this.tokenizer, bytes(dataLen));
    for (const tag of this.parseMetadata(uint8Array)) {
      switch (tag.id) {
        case "TXXX": {
          if (tag.value) {
            for (const text of tag.value.text) {
              this.addTag(ID3v2Parser.makeDescriptionTagName(tag.id, tag.value.description as string), text);
            }
          }

          break;
        }
        case "COM": {
          for (const value of tag.value) {
            this.addTag(ID3v2Parser.makeDescriptionTagName(tag.id, value.description as string), value.text);
          }

          break;
        }
        case "COMM": {
          for (const value of tag.value) {
            this.addTag(ID3v2Parser.makeDescriptionTagName(tag.id, value.description as string), value);
          }

          break;
        }
        default:
          if (Array.isArray(tag.value)) {
            for (const value of tag.value) {
              this.addTag(tag.id, value);
            }
          } else {
            this.addTag(tag.id, tag.value);
          }
      }
    }
  }

  private addTag(id: string, value: any) {
    this.metadata.addTag(this.headerType, id, value);
  }

  private parseMetadata(data: Uint8Array): ITag[] {
    let offset = 0;
    const tags: { id: string; value: any }[] = [];

    while (true) {
      if (offset === data.length) break;

      const frameHeaderLength = ID3v2Parser.getFrameHeaderLength(this.id3Header.major);

      if (offset + frameHeaderLength > data.length) {
        this.metadata.addWarning("Illegal ID3v2 tag length");
        break;
      }

      const frameHeaderBytes = data.slice(offset, (offset += frameHeaderLength));
      const frameHeader = this.readFrameHeader(frameHeaderBytes, this.id3Header.major);

      const frameDataBytes = data.slice(offset, (offset += frameHeader.length));
      const values = ID3v2Parser.readFrameData(
        frameDataBytes,
        frameHeader,
        this.id3Header.major,
        !this.options.skipCovers,
        this.metadata
      );
      if (values) {
        tags.push({ id: frameHeader.id, value: values });
      }
    }
    return tags;
  }

  private readFrameHeader(uint8Array: Uint8Array, majorVer: ID3v2MajorVersion): ID3v2FrameHeader {
    const header = readUnitFromBuffer(id3v2FrameHeader(majorVer), uint8Array, 0);

    if ((majorVer === 2 && !/[\dA-Z]{3}/g.test(header.id)) || !/[\dA-Z]{4}/g.test(header.id)) {
      this.metadata.addWarning(`Invalid ID3v2.${majorVer} frame-header-ID: ${header.id}`);
    }

    return header;
  }
}
