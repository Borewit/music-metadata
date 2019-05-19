'use strict';

import * as initDebug from 'debug';
import * as FileType from 'file-type';
import {ITokenizer} from 'strtok3/lib/type';
import * as Token from 'token-types';
import * as assert from 'assert';

import common from '../common/Util';

import {IPicture, IOptions} from '../type';
import {INativeMetadataCollector} from '../common/MetadataCollector';
import {BasicParser} from '../common/BasicParser';
import {
  DataType,
  DescriptorParser,
  Header,
  IDescriptor,
  IFooter,
  IHeader,
  TagField,
  TagFooter,
  TagItemHeader
} from './APEv2Token';

const debug = initDebug('music-metadata:parser:APEv2');

const tagFormat = 'APEv2';

interface IApeInfo {
  descriptor?: IDescriptor,
  header?: IHeader,
  footer?: IFooter
}

const preamble = 'APETAGEX';

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
   * @param {INativeMetadataCollector} metadata
   * @param {ITokenizer} tokenizer
   * @param {IOptions} options
   * @returns {Promise<boolean>} True if tags have been found
   */
  public static async parseTagHeader(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions): Promise<void> {

    if (tokenizer.fileSize && tokenizer.fileSize - tokenizer.position < TagFooter.len) {
      debug(`No APEv2 header found, end-of-file reached`);
      return;
    }

    const footer = await tokenizer.peekToken<IFooter>(TagFooter);
    if (footer.ID === preamble) {
      await tokenizer.ignore(TagFooter.len);
      const tags = await tokenizer.readToken<Buffer>(TagField(footer));
      APEv2Parser.parseTags(metadata, footer, tags, 0, !options.skipCovers);
    } else {
      debug(`APEv2 header not found at offset=${tokenizer.position}`);
      if (tokenizer.fileSize) {
        // Try to read the APEv2 header using just the footer-header
        const remaining = tokenizer.fileSize - tokenizer.position; // ToDo: take ID3v1 into account
        const buffer = Buffer.alloc(remaining);
        await tokenizer.readBuffer(buffer);
        return APEv2Parser.parseTagFooter(metadata, buffer, !options.skipCovers);
      }
    }
  }

  private static parseTagFooter(metadata: INativeMetadataCollector, buffer: Buffer, includeCovers: boolean) {
    const footer = TagFooter.get(buffer, buffer.length - TagFooter.len);
    assert.equal(footer.ID, preamble, 'APEv2 Footer preamble');
    this.parseTags(metadata, footer, buffer, buffer.length - footer.size, includeCovers);
  }

  private static parseTags(metadata: INativeMetadataCollector, footer: IFooter, buffer: Buffer, offset: number, includeCovers: boolean) {

    for (let i = 0; i < footer.fields; i++) {
      // Only APEv2 tag has tag item headers
      const tagItemHeader = TagItemHeader.get(buffer, offset);
      offset += TagItemHeader.len;

      let zero = common.findZero(buffer, offset, buffer.length);
      const key = buffer.toString('ascii', offset, zero);
      offset = zero + 1;

      switch (tagItemHeader.flags.dataType) {
        case DataType.text_utf8: { // utf-8 textstring
          const value = buffer.toString('utf8', offset, offset += tagItemHeader.size);
          const values = value.split(/\x00/g);

          /*jshint loopfunc:true */
          for (const val of values) {
            metadata.addTag(tagFormat, key, val);
          }
          break;
        }

        case DataType.binary: // binary (probably artwork)
          if (includeCovers) {
            const picData = buffer.slice(offset, offset + tagItemHeader.size);

            let off = 0;
            zero = common.findZero(picData, off, picData.length);
            const description = picData.toString('utf8', off, zero);
            off = zero + 1;

            const data = Buffer.from(picData.slice(off));
            const fileType = FileType(data);

            if (fileType) {
              if (fileType.mime.indexOf('image/') === 0) {
                const picture: IPicture = {
                  description,
                  data,
                  format: fileType.mime
                };

                offset += tagItemHeader.size;
                metadata.addTag(tagFormat, key, picture);
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
          break;

        default:
          throw new Error(`Unexpected data-type: ${tagItemHeader.flags.dataType}`);
      }
    }
  }

  private ape: IApeInfo = {};

  public async parse(): Promise<void> {

    const descriptor = await this.tokenizer.readToken(DescriptorParser);

    assert.equal(descriptor.ID, 'MAC ', 'descriptor.ID');
    this.ape.descriptor = descriptor;
    const lenExp = descriptor.descriptorBytes - DescriptorParser.len;
    const header = await(lenExp > 0 ? this.parseDescriptorExpansion(lenExp) : this.parseHeader());

    await this.tokenizer.readToken(new Token.IgnoreType(header.forwardBytes));
    return APEv2Parser.parseTagHeader(this.metadata, this.tokenizer, this.options);
  }

  private async parseDescriptorExpansion(lenExp: number): Promise<{ forwardBytes: number }> {
    await this.tokenizer.readToken(new Token.IgnoreType(lenExp));
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
