import { BasicParser } from "../common/BasicParser";
import { findZero } from "../common/Util";
import { decodeUtf8 } from "../compat/text-decoder";
import initDebug from "../debug";
import { ApeDescriptor, descriptor as apeDescriptor } from "../parse-unit/apev2/descriptor";
import { footer as apeFooter, type ApeFooter } from "../parse-unit/apev2/footer";
import { ApeHeader, header as apeHeader } from "../parse-unit/apev2/header";
import { itemHeader } from "../parse-unit/apev2/item-header";
import { latin1, utf8 } from "../parse-unit/primitive/string";
import { peekUnitFromTokenizer, readUnitFromBuffer, readUnitFromTokenizer } from "../parse-unit/utility/read-unit";
import { fromBuffer } from "../strtok3/fromBuffer";

import type { INativeMetadataCollector } from "../common/INativeMetadataCollector";
import type { ITokenizer } from "../strtok3/types";
import type { IOptions, IRandomReader, IApeHeader } from "../type";

const debug = initDebug("music-metadata:parser:APEv2");

/**
 * APETag versionIndex history / supported formats
 *
 * 1.0 (1000) - Original APE tag spec.  Fully supported by this code.
 * 2.0 (2000) - Refined APE tag spec (better streaming support, UTF StringEncoding). Fully supported by this code.
 *
 * Notes:
 * - also supports reading of ID3v1.1 tags
 * - all saving done in the APE Tag format using CURRENT_APE_TAG_VERSION
 *
 * APE File Format Overview: (pieces in order -- only valid for the latest versionIndex APE files)
 *
 * JUNK - any amount of "junk" before the APE_DESCRIPTOR (so people that put ID3v2 tags on the files aren't hosed)
 * APE_DESCRIPTOR - defines the sizes (and offsets) of all the pieces, as well as the MD5 checksum
 * APE_HEADER - describes all of the necessary information about the APE file
 * SEEK TABLE - the table that represents seek offsets [optional]
 * HEADER DATA - the pre-audio data from the original file [optional]
 * APE FRAMES - the actual compressed audio (broken into frames for seekability)
 * TERMINATING DATA - the post-audio data from the original file [optional]
 * TAG - describes all the properties of the file [optional]
 */

const tagFormat = "APEv2";

interface IApeInfo {
  descriptor?: ApeDescriptor;
  header?: ApeHeader;
  footer?: ApeFooter;
}

const preamble = "APETAGEX";

export class APEv2Parser extends BasicParser {
  public static tryParseApeHeader(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions) {
    const apeParser = new APEv2Parser();
    apeParser.init(metadata, tokenizer, options);
    return apeParser.tryParseApeHeader();
  }

  /**
   * Calculate the media file duration
   * @param ah ApeHeader
   * @returns {number} duration in seconds
   */
  public static calculateDuration(ah: ApeHeader): number {
    let duration = ah.totalFrames > 1 ? ah.blocksPerFrame * (ah.totalFrames - 1) : 0;
    duration += ah.finalFrameBlocks;
    return duration / ah.sampleRate;
  }

  /**
   * Calculates the APEv1 / APEv2 first field offset
   * @param reader
   * @param offset
   */
  public static async findApeFooterOffset(reader: IRandomReader, offset: number): Promise<IApeHeader | undefined> {
    const [apeFooterSize] = apeFooter;
    // Search for APE footer header at the end of the file
    const apeBuf = new Uint8Array(apeFooterSize);
    await reader.randomRead(apeBuf, 0, apeFooterSize, offset - apeFooterSize);
    const tagFooter = readUnitFromBuffer(apeFooter, apeBuf, 0);
    if (tagFooter.id === "APETAGEX") {
      debug(`APE footer header at offset=${offset}`);
      return { footer: tagFooter, offset: offset - tagFooter.size };
    }
  }

  private static parseTagFooter(
    metadata: INativeMetadataCollector,
    buffer: Uint8Array,
    options: IOptions
  ): Promise<void> {
    const footer = readUnitFromBuffer(apeFooter, buffer, buffer.length - apeFooter[0]);
    if (footer.id !== preamble) throw new Error("Unexpected APEv2 Footer ID preamble value.");
    fromBuffer(buffer);
    const apeParser = new APEv2Parser();
    apeParser.init(metadata, fromBuffer(buffer), options);
    return apeParser.parseTags(footer);
  }

  private ape: IApeInfo = {};

  /**
   * Parse APEv1 / APEv2 header if header signature found
   */
  public async tryParseApeHeader(): Promise<void> {
    if (this.tokenizer.fileInfo.size > 0 && this.tokenizer.fileInfo.size - this.tokenizer.position < apeFooter[0]) {
      debug(`No APEv2 header found, end-of-file reached`);
      return;
    }

    const footer = await peekUnitFromTokenizer(this.tokenizer, apeFooter);
    if (footer.id === preamble) {
      await this.tokenizer.ignore(apeFooter[0]);
      return this.parseTags(footer);
    } else {
      debug(`APEv2 header not found at offset=${this.tokenizer.position}`);
      if (this.tokenizer.fileInfo.size > 0) {
        // Try to read the APEv2 header using just the footer-header
        const remaining = this.tokenizer.fileInfo.size - this.tokenizer.position; // ToDo: take ID3v1 into account
        const buffer = new Uint8Array(remaining);
        await this.tokenizer.readBuffer(buffer);
        return APEv2Parser.parseTagFooter(this.metadata, buffer, this.options);
      }
    }
  }

  public async parse(): Promise<void> {
    const descriptor = await readUnitFromTokenizer(this.tokenizer, apeDescriptor);

    if (descriptor.id !== "MAC ") throw new Error("Unexpected descriptor ID");
    this.ape.descriptor = descriptor;
    const lenExp = descriptor.descriptorBytes - apeDescriptor[0];
    const header = await (lenExp > 0 ? this.parseDescriptorExpansion(lenExp) : this.parseHeader());

    await this.tokenizer.ignore(header.forwardBytes);
    return this.tryParseApeHeader();
  }

  public async parseTags(footer: ApeFooter): Promise<void> {
    const keyBuffer = new Uint8Array(256); // maximum tag key length

    let bytesRemaining = footer.size - apeFooter[0];

    debug(`Parse APE tags at offset=${this.tokenizer.position}, size=${bytesRemaining}`);

    for (let i = 0; i < footer.fields; i++) {
      if (bytesRemaining < itemHeader[0]) {
        this.metadata.addWarning(
          `APEv2 Tag-header: ${footer.fields - i} items remaining, but no more tag data to read.`
        );
        break;
      }

      // Only APEv2 tag has tag item headers
      const tagItemHeader = await readUnitFromTokenizer(this.tokenizer, itemHeader);
      bytesRemaining -= itemHeader[0] + tagItemHeader.size;

      await this.tokenizer.peekBuffer(keyBuffer, {
        length: Math.min(keyBuffer.length, bytesRemaining),
      });
      let zero = findZero(keyBuffer, 0, keyBuffer.length);
      const key = await readUnitFromTokenizer(this.tokenizer, latin1(zero));
      await this.tokenizer.ignore(1);
      bytesRemaining -= key.length + 1;

      switch (tagItemHeader.flags.dataType) {
        case 0: {
          // utf-8 text-string
          const value = await readUnitFromTokenizer(this.tokenizer, utf8(tagItemHeader.size));
          const values = value.split(/\0/g);

          for (const val of values) {
            this.metadata.addTag(tagFormat, key, val);
          }
          break;
        }

        case 1:
          // binary (probably artwork)
          if (this.options.skipCovers) {
            await this.tokenizer.ignore(tagItemHeader.size);
          } else {
            const picData = new Uint8Array(tagItemHeader.size);
            await this.tokenizer.readBuffer(picData);

            zero = findZero(picData, 0, picData.length);
            const description = decodeUtf8(picData.subarray(0, zero));

            const data = new Uint8Array(picData.subarray(zero + 1));
            this.metadata.addTag(tagFormat, key, {
              description,
              data,
            });
          }
          break;

        case 2:
          // external info
          debug(`Ignore external info ${key}`);
          await this.tokenizer.ignore(tagItemHeader.size);
          break;

        case 3:
          // reserved
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
    const header = await readUnitFromTokenizer(this.tokenizer, apeHeader);
    // ToDo before
    this.metadata.setFormat("lossless", true);
    this.metadata.setFormat("container", "Monkey's Audio");

    this.metadata.setFormat("bitsPerSample", header.bitsPerSample);
    this.metadata.setFormat("sampleRate", header.sampleRate);
    this.metadata.setFormat("numberOfChannels", header.channel);
    this.metadata.setFormat("duration", APEv2Parser.calculateDuration(header));

    return {
      forwardBytes:
        this.ape.descriptor.seekTableBytes +
        this.ape.descriptor.headerDataBytes +
        this.ape.descriptor.apeFrameDataBytes +
        this.ape.descriptor.terminatingDataBytes,
    };
  }
}
