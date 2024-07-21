import initDebug from 'debug';
import * as strtok3 from 'strtok3';
import { StringType } from 'token-types';
import { uint8ArrayToString } from 'uint8array-extras';

import * as util from '../common/Util.js';
import { IOptions, IRandomReader, IApeHeader } from '../type.js';
import { INativeMetadataCollector } from '../common/MetadataCollector.js';
import { BasicParser } from '../common/BasicParser.js';
import {
  DataType,
  DescriptorParser,
  Header,
  IDescriptor,
  IFooter,
  IHeader, ITagItemHeader,
  TagFooter,
  TagItemHeader
} from './APEv2Token.js';

const debug = initDebug('music-metadata:parser:APEv2');

const tagFormat = 'APEv2';

interface IApeInfo {
  descriptor?: IDescriptor,
  header?: IHeader,
  footer?: IFooter
}

const preamble = 'APETAGEX';

export class APEv2Parser extends BasicParser {

  public static tryParseApeHeader(metadata: INativeMetadataCollector, tokenizer: strtok3.ITokenizer, options: IOptions) {
    const apeParser = new APEv2Parser();
    apeParser.init(metadata, tokenizer, options);
    return apeParser.tryParseApeHeader();
  }

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
   * @param reader
   * @param offset
   */
  public static async findApeFooterOffset(reader: IRandomReader, offset: number): Promise<IApeHeader> {
    // Search for APE footer header at the end of the file
    const apeBuf = new Uint8Array(TagFooter.len);
    await reader.randomRead(apeBuf, 0, TagFooter.len, offset - TagFooter.len);
    const tagFooter = TagFooter.get(apeBuf, 0);
    if (tagFooter.ID === 'APETAGEX') {
      if (tagFooter.flags.isHeader) {
        debug(`APE Header found at offset=${offset - TagFooter.len}`);
      } else {
        debug(`APE Footer found at offset=${offset - TagFooter.len}`);
        offset -= tagFooter.size;
      }
      return {footer: tagFooter, offset};
    }
  }

  private static parseTagFooter(metadata: INativeMetadataCollector, buffer: Uint8Array, options: IOptions): Promise<void> {
    const footer = TagFooter.get(buffer, buffer.length - TagFooter.len);
    if (footer.ID !== preamble) throw new Error('Unexpected APEv2 Footer ID preamble value.');
    strtok3.fromBuffer(buffer);
    const apeParser = new APEv2Parser();
    apeParser.init(metadata, strtok3.fromBuffer(buffer), options);
    return apeParser.parseTags(footer);
  }

  private ape: IApeInfo = {};

  /**
   * Parse APEv1 / APEv2 header if header signature found
   */
  public async tryParseApeHeader(): Promise<void> {

    if (this.tokenizer.fileInfo.size && this.tokenizer.fileInfo.size - this.tokenizer.position < TagFooter.len) {
      debug(`No APEv2 header found, end-of-file reached`);
      return;
    }

    const footer = await this.tokenizer.peekToken<IFooter>(TagFooter);
    if (footer.ID === preamble) {
      await this.tokenizer.ignore(TagFooter.len);
      return this.parseTags(footer);
    } else {
      debug(`APEv2 header not found at offset=${this.tokenizer.position}`);
      if (this.tokenizer.fileInfo.size) {
        // Try to read the APEv2 header using just the footer-header
        const remaining = this.tokenizer.fileInfo.size - this.tokenizer.position; // ToDo: take ID3v1 into account
        const buffer = new Uint8Array(remaining);
        await this.tokenizer.readBuffer(buffer);
        return APEv2Parser.parseTagFooter(this.metadata, buffer, this.options);
      }
    }
  }

  public async parse(): Promise<void> {

    const descriptor = await this.tokenizer.readToken<IDescriptor>(DescriptorParser);

    if (descriptor.ID !== 'MAC ') throw new Error('Unexpected descriptor ID');
    this.ape.descriptor = descriptor;
    const lenExp = descriptor.descriptorBytes - DescriptorParser.len;
    const header = await (lenExp > 0 ? this.parseDescriptorExpansion(lenExp) : this.parseHeader());

    await this.tokenizer.ignore(header.forwardBytes);
    return this.tryParseApeHeader();
  }

  public async parseTags(footer: IFooter): Promise<void> {

    const keyBuffer = new Uint8Array(256); // maximum tag key length

    let bytesRemaining = footer.size - TagFooter.len;

    debug(`Parse APE tags at offset=${this.tokenizer.position}, size=${bytesRemaining}`);

    for (let i = 0; i < footer.fields; i++) {
      if (bytesRemaining < TagItemHeader.len) {
        this.metadata.addWarning(`APEv2 Tag-header: ${footer.fields - i} items remaining, but no more tag data to read.`);
        break;
      }

      // Only APEv2 tag has tag item headers
      const tagItemHeader = await this.tokenizer.readToken<ITagItemHeader>(TagItemHeader);
      bytesRemaining -= TagItemHeader.len + tagItemHeader.size;

      await this.tokenizer.peekBuffer(keyBuffer, {length: Math.min(keyBuffer.length, bytesRemaining)});
      let zero = util.findZero(keyBuffer, 0, keyBuffer.length);
      const key = await this.tokenizer.readToken<string>(new StringType(zero, 'ascii'));
      await this.tokenizer.ignore(1);
      bytesRemaining -= key.length + 1;

      switch (tagItemHeader.flags.dataType) {
        case DataType.text_utf8: { // utf-8 text-string
          const value = await this.tokenizer.readToken<string>(new StringType(tagItemHeader.size, 'utf8'));
          const values = value.split(/\x00/g);

          await Promise.all(values.map(val => this.metadata.addTag(tagFormat, key, val)));
          break;
        }

        case DataType.binary: // binary (probably artwork)
          if (this.options.skipCovers) {
            await this.tokenizer.ignore(tagItemHeader.size);
          } else {
            const picData = new Uint8Array(tagItemHeader.size);
            await this.tokenizer.readBuffer(picData);

            zero = util.findZero(picData, 0, picData.length);
            const description = uint8ArrayToString(picData.slice(0, zero));
            const data = picData.slice(zero + 1);

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

  private async parseDescriptorExpansion(lenExp: number): Promise<{ forwardBytes: number }> {
    await this.tokenizer.ignore(lenExp);
    return this.parseHeader();
  }

  private async parseHeader(): Promise<{ forwardBytes: number }> {
    const header = await this.tokenizer.readToken(Header);
    // ToDo before
    this.metadata.setFormat('lossless', true);
    this.metadata.setFormat('container', 'Monkey\'s Audio');

    this.metadata.setFormat('bitsPerSample', header.bitsPerSample);
    this.metadata.setFormat('sampleRate', header.sampleRate);
    this.metadata.setFormat('numberOfChannels', header.channel);
    this.metadata.setFormat('duration', APEv2Parser.calculateDuration(header));

    return {
      forwardBytes: this.ape.descriptor.seekTableBytes + this.ape.descriptor.headerDataBytes +
        this.ape.descriptor.apeFrameDataBytes + this.ape.descriptor.terminatingDataBytes
    };
  }
}
