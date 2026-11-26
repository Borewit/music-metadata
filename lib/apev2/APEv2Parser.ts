import { textDecode } from '@borewit/text-codec';
import initDebug from 'debug';
import type { IRandomAccessTokenizer } from 'strtok3';
import * as strtok3 from 'strtok3';
import { StringType } from 'token-types';
import { getMaxMetadataEntries, getTokenizerOptions, readBuffer } from '../common/Allocation.js';
import { BasicParser } from '../common/BasicParser.js';
import { apeTagPreamble } from '../common/MediaFileType.js';
import type { INativeMetadataCollector } from '../common/MetadataCollector.js';
import * as util from '../common/Util.js';
import { makeUnexpectedFileContentError } from '../ParseError.js';
import type { IApeHeader, IOptions } from '../type.js';
import {
  DataType,
  DescriptorParser,
  Header,
  type IDescriptor,
  type IFooter,
  type IHeader,
  type ITagItemHeader,
  TagFooter,
  TagItemHeader
} from './APEv2Token.js';

const debug = initDebug('music-metadata:parser:APEv2');

const tagFormat = 'APEv2';

interface IApeInfo {
  descriptor?: IDescriptor;
  header?: IHeader;
  footer?: IFooter;
}

export class ApeContentError extends makeUnexpectedFileContentError('APEv2') {}

export function tryParseApeHeader(
  metadata: INativeMetadataCollector,
  tokenizer: strtok3.ITokenizer,
  options: IOptions
) {
  const apeParser = new APEv2Parser(metadata, tokenizer, options);
  return apeParser.tryParseApeHeader();
}

export class APEv2Parser extends BasicParser {
  /**
   * Calculate the media file duration
   * @param ah ApeHeader
   * @return {number} duration in seconds
   */
  public static calculateDuration(ah: IHeader): number {
    let duration = ah.totalFrames > 1 ? ah.blocksPerFrame * (ah.totalFrames - 1) : 0;
    duration += ah.finalFrameBlocks;
    return duration / ah.sampleRate;
  }

  /**
   * Calculates the APEv1 / APEv2 first field offset
   * @param tokenizer
   * @param offset
   */
  public static async findApeFooterOffset(
    tokenizer: IRandomAccessTokenizer,
    offset: number
  ): Promise<IApeHeader | undefined> {
    // Search for APE footer header at the end of the file
    const apeBuf = new Uint8Array(TagFooter.len);
    const position = tokenizer.position;
    if (offset <= TagFooter.len) {
      debug(`Offset is too small to read APE footer: offset=${offset}`);
      return undefined;
    }
    if (offset > TagFooter.len) {
      await tokenizer.readBuffer(apeBuf, { position: offset - TagFooter.len });
      tokenizer.setPosition(position);
      const tagFooter = TagFooter.get(apeBuf, 0);
      if (tagFooter.ID === 'APETAGEX') {
        if (tagFooter.flags.isHeader) {
          debug(`APE Header found at offset=${offset - TagFooter.len}`);
        } else {
          debug(`APE Footer found at offset=${offset - TagFooter.len}`);
          offset -= tagFooter.size;
        }
        return { footer: tagFooter, offset };
      }
    }
  }

  private static parseTagFooter(
    metadata: INativeMetadataCollector,
    buffer: Uint8Array,
    options: IOptions
  ): Promise<void> {
    const footer = TagFooter.get(buffer, buffer.length - TagFooter.len);
    if (footer.ID !== apeTagPreamble) {
      throw new ApeContentError('Unexpected APEv2 Footer ID preamble value');
    }
    const apeParser = new APEv2Parser(metadata, strtok3.fromBuffer(buffer, getTokenizerOptions(options)), options);
    return apeParser.parseTags(footer);
  }

  private ape: IApeInfo = {};

  /**
   * Parse APEv1 / APEv2 header if header signature found
   */
  public async tryParseApeHeader(): Promise<void> {
    if (this.tokenizer.fileInfo.size && this.tokenizer.fileInfo.size - this.tokenizer.position < TagFooter.len) {
      debug('No APEv2 header found, end-of-file reached');
      return;
    }

    const footer = await this.tokenizer.peekToken<IFooter>(TagFooter);
    if (footer.ID === apeTagPreamble) {
      await this.tokenizer.ignore(TagFooter.len);
      return this.parseTags(footer);
    }
    debug(`APEv2 header not found at offset=${this.tokenizer.position}`);
    if (this.tokenizer.fileInfo.size) {
      // Try to read the APEv2 header using just the footer-header
      const remaining = this.tokenizer.fileInfo.size - this.tokenizer.position; // ToDo: take ID3v1 into account
      const buffer = await this.readTagValue(remaining);
      return APEv2Parser.parseTagFooter(this.metadata, buffer, this.options);
    }
  }

  public async parse(): Promise<void> {
    const descriptor = await this.tokenizer.readToken<IDescriptor>(DescriptorParser);

    if (descriptor.ID !== 'MAC ') {
      throw new ApeContentError('Unexpected descriptor ID');
    }
    this.ape.descriptor = descriptor;
    const lenExp = descriptor.descriptorBytes - DescriptorParser.len;
    const header = await (lenExp > 0 ? this.parseDescriptorExpansion(lenExp) : this.parseHeader());

    this.metadata.setAudioOnly();
    await this.tokenizer.ignore(header.forwardBytes);
    return this.tryParseApeHeader();
  }

  public async parseTags(footer: IFooter): Promise<void> {
    if (footer.fields > getMaxMetadataEntries(this.options)) {
      throw new ApeContentError(
        `Tag item count ${footer.fields} exceeds entry limit ${getMaxMetadataEntries(this.options)}`
      );
    }
    const keyBuffer = new Uint8Array(256); // maximum tag key length

    let bytesRemaining = footer.size - TagFooter.len;

    debug(`Parse APE tags at offset=${this.tokenizer.position}, size=${bytesRemaining}`);

    for (let i = 0; i < footer.fields; i++) {
      if (bytesRemaining < TagItemHeader.len) {
        this.metadata.addWarning(
          `APEv2 Tag-header: ${footer.fields - i} items remaining, but no more tag data to read.`
        );
        break;
      }

      // Only APEv2 tag has tag item headers
      const tagItemHeader = await this.tokenizer.readToken<ITagItemHeader>(TagItemHeader);
      bytesRemaining -= TagItemHeader.len;

      // Reserve the value bytes before looking for the key terminator.
      if (tagItemHeader.size >= bytesRemaining) {
        throw new ApeContentError(`Invalid tag item size: ${tagItemHeader.size}`);
      }
      const keyBytes = await this.tokenizer.peekBuffer(keyBuffer, {
        length: Math.min(keyBuffer.length, bytesRemaining - tagItemHeader.size),
        mayBeLess: true
      });
      let zero = keyBuffer.subarray(0, keyBytes).indexOf(0);
      if (zero === -1) {
        throw new ApeContentError('Unterminated tag item key');
      }
      const key = await this.tokenizer.readToken<string>(new StringType(zero, 'ascii'));
      await this.tokenizer.ignore(1);
      bytesRemaining -= key.length + 1;

      if (
        this.tokenizer.fileInfo.size !== undefined &&
        tagItemHeader.size > this.tokenizer.fileInfo.size - this.tokenizer.position
      ) {
        throw new ApeContentError(`Invalid tag item size: ${tagItemHeader.size}`);
      }
      bytesRemaining -= tagItemHeader.size;

      switch (tagItemHeader.flags.dataType) {
        case DataType.text_utf8: {
          // utf-8 text-string
          const value = textDecode(await this.readTagValue(tagItemHeader.size), 'utf-8');
          let valueCount = 1;
          for (let offset = value.indexOf('\0'); offset >= 0; offset = value.indexOf('\0', offset + 1)) {
            ++valueCount;
          }
          if (valueCount > getMaxMetadataEntries(this.options)) {
            throw new ApeContentError(
              `Text value count ${valueCount} exceeds entry limit ${getMaxMetadataEntries(this.options)}`
            );
          }
          const values = value.split(/\x00/g);

          await Promise.all(values.map(val => this.metadata.addTag(tagFormat, key, val)));
          break;
        }

        case DataType.binary: // binary (probably artwork)
          if (this.options.skipCovers) {
            await this.tokenizer.ignore(tagItemHeader.size);
          } else {
            const picData = await this.readTagValue(tagItemHeader.size);

            zero = util.findZero(picData);
            const description = textDecode(picData.subarray(0, zero), 'utf-8');
            const data = picData.subarray(zero + 1);

            await this.metadata.addTag(tagFormat, key, {
              description,
              data
            });
          }
          break;

        case DataType.external_info:
          debug(`Ignore external info ${key}`);
          await this.tokenizer.ignore(tagItemHeader.size);
          break;

        case DataType.reserved:
          debug(`Ignore external info ${key}`);
          this.metadata.addWarning(`APEv2 header declares a reserved datatype for "${key}"`);
          await this.tokenizer.ignore(tagItemHeader.size);
          break;
      }
    }
  }

  private async readTagValue(size: number): Promise<Uint8Array> {
    return readBuffer(this.tokenizer, size, this.options, undefined, message => new ApeContentError(message));
  }

  private async parseDescriptorExpansion(lenExp: number): Promise<{ forwardBytes: number }> {
    await this.tokenizer.ignore(lenExp);
    return this.parseHeader();
  }

  private async parseHeader(): Promise<{ forwardBytes: number }> {
    const header = await this.tokenizer.readToken(Header);
    // ToDo before
    this.metadata.setFormat('lossless', true);
    this.metadata.setFormat('container', "Monkey's Audio");
    this.metadata.setFormat('codec', "Monkey's Audio");

    this.metadata.setFormat('bitsPerSample', header.bitsPerSample);
    this.metadata.setFormat('sampleRate', header.sampleRate);
    this.metadata.setFormat('numberOfChannels', header.channel);
    this.metadata.setFormat('duration', APEv2Parser.calculateDuration(header));

    if (!this.ape.descriptor) {
      throw new ApeContentError('Missing APE descriptor');
    }

    return {
      forwardBytes:
        this.ape.descriptor.seekTableBytes +
        this.ape.descriptor.headerDataBytes +
        this.ape.descriptor.apeFrameDataBytes +
        this.ape.descriptor.terminatingDataBytes
    };
  }
}

export class APEv2TagParser extends APEv2Parser {
  public override async parse(): Promise<void> {
    const header = await this.tokenizer.readToken(TagFooter);
    if (
      header.ID !== apeTagPreamble ||
      header.version !== 2000 ||
      !header.flags.isHeader ||
      header.size < TagFooter.len
    ) {
      throw new ApeContentError('Invalid leading APEv2 tag header');
    }
    const itemsEnd = this.tokenizer.position + header.size - TagFooter.len;
    const fileSize = this.tokenizer.fileInfo.size;
    if (fileSize !== undefined && itemsEnd > fileSize) {
      throw new ApeContentError('Leading APEv2 tag exceeds file size');
    }
    await this.parseTags(header);
    const padding = itemsEnd - this.tokenizer.position;
    if (padding > 0 && (await this.tokenizer.ignore(padding)) !== padding) {
      throw new ApeContentError('Truncated leading APEv2 tag');
    }

    // Writers disagree on the footer flag. Consume a matching footer when present.
    const footerBytes = new Uint8Array(TagFooter.len);
    if ((await this.tokenizer.peekBuffer(footerBytes, { mayBeLess: true })) === TagFooter.len) {
      const footer = TagFooter.get(footerBytes, 0);
      if (
        footer.ID === header.ID &&
        !footer.flags.isHeader &&
        footer.version === header.version &&
        footer.size === header.size &&
        footer.fields === header.fields
      ) {
        await this.tokenizer.ignore(TagFooter.len);
      }
    }
  }
}
