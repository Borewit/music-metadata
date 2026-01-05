import type { ITokenizer } from 'strtok3';
import * as Token from 'token-types';

import type { TagType } from '../common/GenericTagTypes.js';
import { FrameParser, Id3v2ContentError, type ITextTag } from './FrameParser.js';
import { ExtendedHeader, ID3v2Header, type ID3v2MajorVersion, type IID3v2header } from './ID3v2Token.js';

import type { ITag, IOptions, AnyTagValue, IChapter } from '../type.js';
import type { INativeMetadataCollector, IWarningCollector } from '../common/MetadataCollector.js';

import { getFrameHeaderLength, readFrameHeader } from './FrameHeader.js';

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
  length: number;
  flags?: IFrameFlags;
}

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
    return buffer.subarray(0, writeI);
  }

  private static readFrameData(uint8Array: Uint8Array, frameHeader: IFrameHeader, majorVer: ID3v2MajorVersion, includeCovers: boolean, warningCollector: IWarningCollector) {
    const frameParser = new FrameParser(majorVer, warningCollector);
    switch (majorVer) {
      case 2:
        return frameParser.readData(uint8Array, frameHeader.id, includeCovers);
      case 3:
      case 4:
        if (frameHeader.flags?.format.unsynchronisation) {
          uint8Array = ID3v2Parser.removeUnsyncBytes(uint8Array);
        }
        if (frameHeader.flags?.format.data_length_indicator) {
          uint8Array = uint8Array.subarray(4, uint8Array.length);
        }
        return frameParser.readData(uint8Array, frameHeader.id, includeCovers);
      default:
        throw makeUnexpectedMajorVersionError(majorVer);
    }
  }

  /**
   * Create a combined tag key, of tag & description
   * @param tag e.g.: COM
   * @param description e.g. iTunPGAP
   * @returns string e.g. COM:iTunPGAP
   */
  private static makeDescriptionTagName(tag: string, description: string): string {
    return tag + (description ? `:${description}` : '');
  }

  private tokenizer: ITokenizer = undefined as unknown as ITokenizer;
  private id3Header: IID3v2header = undefined as unknown as IID3v2header;
  private metadata: INativeMetadataCollector = undefined as unknown as INativeMetadataCollector;

  private headerType: TagType= undefined as unknown as TagType;
  private options: IOptions= undefined as unknown as IOptions;

  public async parse(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions): Promise<void> {

    this.tokenizer = tokenizer;
    this.metadata = metadata;
    this.options = options;

    const id3Header = await this.tokenizer.readToken(ID3v2Header);

    if (id3Header.fileIdentifier !== 'ID3') {
      throw new Id3v2ContentError('expected ID3-header file-identifier \'ID3\' was not found');
    }

    this.id3Header = id3Header;

    this.headerType = (`ID3v2.${id3Header.version.major}`) as TagType;

    await (id3Header.flags.isExtendedHeader ? this.parseExtendedHeader() : this.parseId3Data(id3Header.size));

    // Post process
    const chapters = ID3v2Parser.mapId3v2Chapters(this.metadata.native[this.headerType], this.metadata.format.sampleRate);
    this.metadata.setFormat('chapters', chapters);
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
            await this.handleTag(tag, (tag.value as ITextTag).text, () => (tag.value as ITextTag).description);
          }
          break;
        default:
          await (Array.isArray(tag.value) ? Promise.all(tag.value.map(value => this.addTag(tag.id, value))) : this.addTag(tag.id, tag.value));
      }
    }
  }

  private async handleTag(tag: ITag, values: string[], descriptor: (x: AnyTagValue) => string, resolveValue: (x: string) => string = value => value): Promise<void> {
    await Promise.all(values.map(value =>
      this.addTag(ID3v2Parser.makeDescriptionTagName(tag.id, descriptor(value)), resolveValue(value))
    ));
  }

  private async addTag(id: string, value: AnyTagValue): Promise<void> {
    await this.metadata.addTag(this.headerType, id, value);
  }

  private parseMetadata(data: Uint8Array): ITag[] {
    let offset = 0;
    const tags: { id: string, value: AnyTagValue }[] = [];

    while (true) {
      if (offset === data.length) break;

      const frameHeaderLength = getFrameHeaderLength(this.id3Header.version.major);

      if (offset + frameHeaderLength > data.length) {
        this.metadata.addWarning('Illegal ID3v2 tag length');
        break;
      }

      const frameHeaderBytes = data.subarray(offset, offset + frameHeaderLength);
      offset += frameHeaderLength;
      const frameHeader = readFrameHeader(frameHeaderBytes, this.id3Header.version.major, this.metadata);

      const frameDataBytes = data.subarray(offset, offset + frameHeader.length);
      offset += frameHeader.length;
      const values = ID3v2Parser.readFrameData(frameDataBytes, frameHeader, this.id3Header.version.major, !this.options.skipCovers, this.metadata);
      if (values) {
        tags.push({id: frameHeader.id, value: values});
      }
    }
    return tags;
  }

  /**
   * Convert parsed ID3v2 chapter frames (CHAP / CTOC) to generic `format.chapters`.
   *
   * This function expects the `native` tags already to contain parsed `CHAP` and `CTOC` frame values,
   * as produced by `FrameParser.readData`.
   */
  private static mapId3v2Chapters(
    id3Tags: ITag[],
    sampleRate?: number
  ): IChapter[] | undefined {

    const chapFrames = id3Tags.filter(t => t.id === 'CHAP') as any[] | undefined;
    if (!chapFrames?.length) return;

    const tocFrames = id3Tags.filter(t => t.id === 'CTOC') as any[] | undefined;
    const topLevelToc = tocFrames?.find(t => t.value.flags?.topLevel);

    const chapterById = new Map<string, any>();
    for (const chap of chapFrames) {
      chapterById.set(chap.value.label, chap.value);
    }

    const orderedIds: string[] | undefined =
      topLevelToc?.value.childElementIds;

    const chapters: IChapter[] = [];

    const source = orderedIds ?? [...chapterById.keys()];

    for (const id of source) {
      const chap = chapterById.get(id);
      if (!chap) continue;

      const frames = chap.frames;
      const title = frames.get('TIT2');
      if (!title) continue; // title is required

      chapters.push({
        id,
        title,
        url: frames.get('WXXX'),
        start: chap.info.startTime / 1000,
        end: chap.info.endTime / 1000,
        image: frames.get('APIC')
      });
    }

    // If no ordered CTOC, sort by time
    if (!orderedIds) {
      chapters.sort((a, b) => a.start - b.start);
    }

    return chapters.length ? chapters : undefined;
  }
}

function makeUnexpectedMajorVersionError(majorVer: number): never {
  throw new Id3v2ContentError(`Unexpected majorVer: ${majorVer}`);
}

