'use strict';

import * as initDebug from 'debug';
import * as FileType from 'file-type';
import * as strtok3 from 'strtok3/lib/core';
import * as assert from 'assert';

import common from '../common/Util';

import { IPicture, IOptions, IRandomReader, IApeHeader } from '../type';
import { INativeMetadataCollector } from '../common/MetadataCollector';
import { BasicParser } from '../common/BasicParser';
import {
  DataType,
  DescriptorParser,
  Header,
  IDescriptor,
  IFooter,
  IHeader, ITagItemHeader,
  TagFooter,
  TagItemHeader
} from './APEv2Token';
import { StringType } from 'token-types';

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
    const apeBuf = Buffer.alloc(TagFooter.len);
    await reader.randomRead(apeBuf, 0, TagFooter.len, offset - TagFooter.len);
    const tagFooter = TagFooter.get(apeBuf, 0);
    if (tagFooter.ID === 'APETAGEX') {
      debug(`APE footer header at offset=${offset}`);
      return {footer: tagFooter, offset: offset - tagFooter.size};
    }
  }

  private static parseTagFooter(metadata: INativeMetadataCollector, buffer: Buffer, options: IOptions): Promise<void> {
    const footer = TagFooter.get(buffer, buffer.length - TagFooter.len);
    assert.strictEqual(footer.ID, preamble, 'APEv2 Footer preamble');
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

    if (this.tokenizer.fileSize && this.tokenizer.fileSize - this.tokenizer.position < TagFooter.len) {
      debug(`No APEv2 header found, end-of-file reached`);
      return;
    }

    const footer = await this.tokenizer.peekToken<IFooter>(TagFooter);
    if (footer.ID === preamble) {
      await this.tokenizer.ignore(TagFooter.len);
      return this.parseTags(footer);
    } else {
      debug(`APEv2 header not found at offset=${this.tokenizer.position}`);
      if (this.tokenizer.fileSize) {
        // Try to read the APEv2 header using just the footer-header
        const remaining = this.tokenizer.fileSize - this.tokenizer.position; // ToDo: take ID3v1 into account
        const buffer = Buffer.alloc(remaining);
        await this.tokenizer.readBuffer(buffer);
        return APEv2Parser.parseTagFooter(this.metadata, buffer, this.options);
      }
    }
  }

  public async parse(): Promise<void> {

    const descriptor = await this.tokenizer.readToken<IDescriptor>(DescriptorParser);

    assert.strictEqual(descriptor.ID, 'MAC ', 'descriptor.ID');
    this.ape.descriptor = descriptor;
    const lenExp = descriptor.descriptorBytes - DescriptorParser.len;
    const header = await (lenExp > 0 ? this.parseDescriptorExpansion(lenExp) : this.parseHeader());

    await this.tokenizer.ignore(header.forwardBytes);
    return this.tryParseApeHeader();
  }

  public async parseTags(footer: IFooter): Promise<void> {

    const keyBuffer = Buffer.alloc(256); // maximum tag key length

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

      await this.tokenizer.peekBuffer(keyBuffer, 0, Math.min(keyBuffer.length, bytesRemaining));
      let zero = common.findZero(keyBuffer, 0, keyBuffer.length);
      const key = await this.tokenizer.readToken<string>(new StringType(zero, 'ascii'));
      await this.tokenizer.ignore(1);
      bytesRemaining -= key.length + 1;

      switch (tagItemHeader.flags.dataType) {
        case DataType.text_utf8: { // utf-8 textstring
          const value = await this.tokenizer.readToken<string>(new StringType(tagItemHeader.size, 'utf8'));
          const values = value.split(/\x00/g);

          /*jshint loopfunc:true */
          for (const val of values) {
            this.metadata.addTag(tagFormat, key, val);
          }
          break;
        }

        case DataType.binary: // binary (probably artwork)
          if (this.options.skipCovers) {
            await this.tokenizer.ignore(tagItemHeader.size);
          } else {
            const picData = Buffer.alloc(tagItemHeader.size);
            await this.tokenizer.readBuffer(picData);

            zero = common.findZero(picData, 0, picData.length);
            const description = picData.toString('utf8', 0, zero);

            const data = Buffer.from(picData.slice(zero + 1));
            const fileType = FileType(data);

            if (fileType) {
              if (fileType.mime.indexOf('image/') === 0) {
                const picture: IPicture = {
                  description,
                  data,
                  format: fileType.mime
                };
                this.metadata.addTag(tagFormat, key, picture);
              } else {
                debug(`Unexpected binary tag of type': ${fileType.mime}`);
              }
            } else {
              debug(`Failed to determine file type for binary tag: ${key}`);
            }
          }
          break;

        case DataType.external_info:
          debug(`Ignore external info ${key}`);
          await this.tokenizer.ignore(tagItemHeader.size);
          break;

        default:
          throw new Error(`Unexpected data-type: ${tagItemHeader.flags.dataType}`);
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
