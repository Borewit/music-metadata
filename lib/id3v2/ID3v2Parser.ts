import type { ITokenizer } from 'strtok3';
import * as Token from 'token-types';

import { getMaxChapterCount, getMaxMetadataEntries, readBuffer } from '../common/Allocation.js';
import type { TagType } from '../common/GenericTagTypes.js';
import type { INativeMetadataCollector, IWarningCollector } from '../common/MetadataCollector.js';
import type { AnyTagValue, IChapter, IOptions, ITag } from '../type.js';
import { getFrameHeaderLength, readFrameHeader } from './FrameHeader.js';
import { type Chapter, FrameParser, Id3v2ContentError, type ITextTag, type TableOfContents } from './FrameParser.js';
import { ID3v2Header, type ID3v2MajorVersion, type IID3v2header, UINT32SYNCSAFE } from './ID3v2Token.js';

interface IFrameFlags {
  status: {
    tag_alter_preservation: boolean;
    file_alter_preservation: boolean;
    read_only: boolean;
  };
  format: {
    grouping_identity: boolean;
    compression: boolean;
    encryption: boolean;
    unsynchronisation: boolean;
    data_length_indicator: boolean;
  };
}

interface IFrameHeader {
  id: string;
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
      readI += buffer[readI] === 0xff && buffer[readI + 1] === 0 ? 2 : 1;
      writeI++;
    }
    if (readI < buffer.length) {
      buffer[writeI++] = buffer[readI];
    }
    return buffer.subarray(0, writeI);
  }

  private static readFrameData(
    uint8Array: Uint8Array,
    frameHeader: IFrameHeader,
    majorVer: ID3v2MajorVersion,
    includeCovers: boolean,
    warningCollector: IWarningCollector,
    maxEntries: number
  ) {
    const frameParser = new FrameParser(majorVer, warningCollector, maxEntries);
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

  private headerType: TagType = undefined as unknown as TagType;
  private options: IOptions = undefined as unknown as IOptions;

  public async parse(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions): Promise<void> {
    this.tokenizer = tokenizer;
    this.metadata = metadata;
    this.options = options;

    const id3Header = await this.tokenizer.readToken(ID3v2Header);

    if (id3Header.fileIdentifier !== 'ID3') {
      throw new Id3v2ContentError("expected ID3-header file-identifier 'ID3' was not found");
    }

    const fileSize = this.tokenizer.fileInfo.size;
    if (fileSize !== undefined) {
      const remainingBytes = fileSize - this.tokenizer.position;
      if (id3Header.size > remainingBytes) {
        throw new Id3v2ContentError(`ID3v2 tag size ${id3Header.size} exceeds remaining file size ${remainingBytes}`);
      }
    }

    this.id3Header = id3Header;

    this.headerType = `ID3v2.${id3Header.version.major}` as TagType;

    await this.parseId3Data(id3Header.size);

    // Post process
    const chapters = this.mapId3v2Chapters(this.metadata.native[this.headerType]);
    this.metadata.setFormat('chapters', chapters);
  }

  private getExtendedHeaderSize(data: Uint8Array): number {
    if (data.length < Token.UINT32_BE.len) {
      throw new Id3v2ContentError('ID3v2 extended header size field exceeds tag boundary');
    }
    // The ID3v2.3 size excludes its own 4 bytes, the synchsafe ID3v2.4 size includes them
    const extendedHeaderSize =
      this.id3Header.version.major === 4 ? UINT32SYNCSAFE.get(data, 0) : Token.UINT32_BE.get(data, 0) + 4;
    // An ID3v2.3 extended header takes at least 10 bytes, an ID3v2.4 one at least 6
    const minimumSize = this.id3Header.version.major === 4 ? 6 : 10;
    if (extendedHeaderSize < minimumSize || extendedHeaderSize > data.length) {
      throw new Id3v2ContentError(`Invalid ID3v2 extended header size: ${extendedHeaderSize}`);
    }
    return extendedHeaderSize;
  }

  public async parseId3Data(dataLen: number): Promise<void> {
    // Own the complete on-disk body before resynchronising, including custom tokenizer inputs.
    let uint8Array = await readBuffer(
      this.tokenizer,
      dataLen,
      this.options,
      undefined,
      message => new Id3v2ContentError(message)
    );
    // ID3v2.2 and ID3v2.3 unsynchronise the whole tag, ID3v2.4 flags each frame
    if (this.id3Header.flags.unsynchronisation && this.id3Header.version.major < 4) {
      uint8Array = ID3v2Parser.removeUnsyncBytes(uint8Array);
    }
    if (this.id3Header.flags.isExtendedHeader) {
      uint8Array = uint8Array.subarray(this.getExtendedHeaderSize(uint8Array));
    }
    const tags = this.parseMetadata(uint8Array);
    for (const tag of tags) {
      switch (tag.id) {
        case 'TXXX':
          if (tag.value) {
            await this.handleTag(tag, (tag.value as ITextTag).text, () => (tag.value as ITextTag).description);
          }
          break;
        default:
          await (Array.isArray(tag.value)
            ? Promise.all(tag.value.map(value => this.addTag(tag.id, value)))
            : this.addTag(tag.id, tag.value));
      }
    }
    if (this.id3Header.version.major === 3) {
      await this.mapRecordingDate(tags);
    }
  }

  private async mapRecordingDate(tags: ITag[]): Promise<void> {
    const text = (id: string) =>
      (tags.findLast(tag => tag.id === id && (tag.value as string[]).at(-1))?.value as string[] | undefined)?.at(-1);
    // Explicit timestamps take priority over the legacy components, regardless of frame order.
    const discogs = tags.findLast(
      tag =>
        tag.id === 'TXXX' &&
        (tag.value as ITextTag).description.toUpperCase() === 'DISCOGS_RELEASED' &&
        (tag.value as ITextTag).text.at(-1)
    );
    const explicit = text('TDRC') ?? text('TDRV') ?? (discogs?.value as ITextTag | undefined)?.text.at(-1);
    if (explicit) {
      await this.metadata.postMap(this.headerType, { id: 'date', value: explicit });
      return;
    }

    const year = text('TYER');
    if (!year || !/^\d{4}$/.test(year)) {
      return;
    }

    let date = year;
    const dayMonth = text('TDAT');
    if (dayMonth && /^\d{4}$/.test(dayMonth)) {
      const day = Number(dayMonth.slice(0, 2));
      const month = Number(dayMonth.slice(2));
      const y = Number(year);
      const leapYear = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
      const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      if (day >= 1 && day <= daysInMonth[month - 1]) {
        date += `-${dayMonth.slice(2)}-${dayMonth.slice(0, 2)}`;
        const time = text('TIME');
        if (time && /^([01]\d|2[0-3])[0-5]\d$/.test(time)) {
          date += `T${time.slice(0, 2)}:${time.slice(2)}`;
        }
      }
    }
    await this.metadata.postMap(this.headerType, { id: 'date', value: date });
  }

  private async handleTag(
    tag: ITag,
    values: string[],
    descriptor: (x: AnyTagValue) => string,
    resolveValue: (x: string) => string = value => value
  ): Promise<void> {
    await Promise.all(
      values.map(value =>
        this.addTag(ID3v2Parser.makeDescriptionTagName(tag.id, descriptor(value)), resolveValue(value))
      )
    );
  }

  private async addTag(id: string, value: AnyTagValue): Promise<void> {
    await this.metadata.addTag(this.headerType, id, value);
  }

  private parseMetadata(data: Uint8Array): ITag[] {
    let offset = 0;
    let frameCount = 0;
    const tags: { id: string; value: AnyTagValue }[] = [];

    while (true) {
      if (offset === data.length) {
        break;
      }

      // Padding follows the last frame and consists entirely of zero bytes.
      // Check before requiring a complete frame header: padding can be shorter.
      if (data[offset] === 0) {
        if (data.subarray(offset).some(byte => byte !== 0)) {
          this.metadata.addWarning('Non-zero bytes found in ID3v2 padding');
        }
        break;
      }

      const frameHeaderLength = getFrameHeaderLength(this.id3Header.version.major);

      if (offset + frameHeaderLength > data.length) {
        this.metadata.addWarning('Illegal ID3v2 tag length');
        break;
      }

      const frameHeaderBytes = data.subarray(offset, offset + frameHeaderLength);
      offset += frameHeaderLength;
      const frameHeader = readFrameHeader(frameHeaderBytes, this.id3Header.version.major, this.metadata);
      if (++frameCount > getMaxMetadataEntries(this.options)) {
        throw new Id3v2ContentError('Frame count exceeds entry limit');
      }

      const frameDataBytes = data.subarray(offset, offset + frameHeader.length);
      offset += frameHeader.length;
      const values = ID3v2Parser.readFrameData(
        frameDataBytes,
        frameHeader,
        this.id3Header.version.major,
        !this.options.skipCovers,
        this.metadata,
        getMaxMetadataEntries(this.options)
      );
      if (values) {
        tags.push({ id: frameHeader.id, value: values });
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
  private mapId3v2Chapters(id3Tags?: ITag[]): IChapter[] | undefined {
    if (!id3Tags) {
      return;
    }

    const chapFrames = id3Tags.filter(t => t.id === 'CHAP').map(t => t.value as Chapter);
    if (!chapFrames.length) {
      return;
    }

    const tocFrames = id3Tags.filter(t => t.id === 'CTOC').map(t => t.value as TableOfContents);
    const topLevelToc = tocFrames.find(t => t.flags.topLevel);

    const chapterById = new Map<string, Chapter>();
    for (const chap of chapFrames) {
      chapterById.set(chap.label, chap);
    }

    const orderedIds = topLevelToc?.childElementIds;

    const chapters: IChapter[] = [];

    const maxChapterCount = getMaxChapterCount(this.options);
    // Without a CTOC, return the earliest chapters even if CHAP frames arrive out of order.
    const source =
      orderedIds ??
      [...chapterById.keys()].sort(
        (left, right) => (chapterById.get(left)?.info.startTime ?? 0) - (chapterById.get(right)?.info.startTime ?? 0)
      );

    for (const id of source) {
      const chap = chapterById.get(id);
      if (!chap) {
        continue;
      }

      const frames = chap.frames;
      // TIT2 is recommended, not required; keep untitled chapters navigable.
      const title = (frames.get('TIT2') as IChapter['title'] | undefined) ?? '';

      if (chapters.length >= maxChapterCount) {
        this.metadata.addWarning(`Chapter count exceeds the ${maxChapterCount} chapter limit`);
        break;
      }
      chapters.push({
        id,
        title,
        url: frames.get('WXXX') as IChapter['url'],
        start: chap.info.startTime / 1000,
        end: chap.info.endTime / 1000,
        image: frames.get('APIC') as IChapter['image']
      });
    }

    return chapters.length ? chapters : undefined;
  }
}

function makeUnexpectedMajorVersionError(majorVer: number): never {
  throw new Id3v2ContentError(`Unexpected majorVer: ${majorVer}`);
}
