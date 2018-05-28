"use strict";

import common from "../common/Util";
import {TagType} from "../common/GenericTagTypes";
import {INativeAudioMetadata, IOptions, IFormat} from "../";
import {ITokenParser} from "../ParserFactory";
import {ITokenizer, IgnoreType} from "strtok3";
import * as Token from "token-types";
import {FourCcToken} from "../common/FourCC";
import {Promise} from "bluebird";
import FileType = require("file-type");

import * as _debug from "debug";
import {IPicture} from "../index";
const debug = _debug("music-metadata:parser:APEv2");

/**
 * APETag versionIndex history / supported formats
 *
 *  1.0 (1000) - Original APE tag spec.  Fully supported by this code.
 *  2.0 (2000) - Refined APE tag spec (better streaming support, UTF StringEncoding). Fully supported by this code.
 *
 *  Notes:
 *  - also supports reading of ID3v1.1 tags
 *  - all saving done in the APE Tag format using CURRENT_APE_TAG_VERSION
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

interface IDescriptor {
  // should equal 'MAC '
  ID: string,
  // versionIndex number * 1000 (3.81 = 3810) (remember that 4-byte alignment causes this to take 4-bytes)
  version: number,
  // the number of descriptor bytes (allows later expansion of this header)
  descriptorBytes: number,
  // the number of header APE_HEADER bytes
  headerBytes: number,
  // the number of header APE_HEADER bytes
  seekTableBytes: number,
  // the number of header data bytes (from original file)
  headerDataBytes: number,
  // the number of bytes of APE frame data
  apeFrameDataBytes: number,
  // the high order number of APE frame data bytes
  apeFrameDataBytesHigh: number,
  // the terminating data of the file (not including tag data)
  terminatingDataBytes: number,
  // the MD5 hash of the file (see notes for usage... it's a littly tricky)
  fileMD5: Buffer
}

/**
 * APE_HEADER: describes all of the necessary information about the APE file
 */
export interface IHeader {
  // the compression level (see defines I.E. COMPRESSION_LEVEL_FAST)
  compressionLevel: number,
  // any format flags (for future use)
  formatFlags: number,
  // the number of audio blocks in one frame
  blocksPerFrame: number,
  // the number of audio blocks in the final frame
  finalFrameBlocks: number,
  // the total number of frames
  totalFrames: number,
  // the bits per sample (typically 16)
  bitsPerSample: number,
  // the number of channels (1 or 2)
  channel: number,
  // the sample rate (typically 44100)
  sampleRate: number
}

interface IFooter {
  // should equal 'APETAGEX'
  ID: string,
  // equals CURRENT_APE_TAG_VERSION
  version: number,
  // the complete size of the tag, including this footer (excludes header)
  size: number,
  // the number of fields in the tag
  fields: number,
  // reserved for later use (must be zero)
  reserved: Buffer // ToDo: what is this???
}

interface ITagFlags {
  containsHeader: boolean,
  containsFooter: boolean,
  isHeader: boolean,
  readOnly: boolean,
  dataType: DataType
}

enum DataType {
  text_utf8 = 0,
  binary = 1,
  external_info = 2,
  reserved = 3
}

class Structure {
  /**
   * APE_DESCRIPTOR: defines the sizes (and offsets) of all the pieces, as well as the MD5 checksum
   */
  public static DescriptorParser: Token.IGetToken<IDescriptor> = {
    len: 52,

    get: (buf, off) => {
      return {
        // should equal 'MAC '
        ID: FourCcToken.get(buf, off),
        // versionIndex number * 1000 (3.81 = 3810) (remember that 4-byte alignment causes this to take 4-bytes)
        version: Token.UINT32_LE.get(buf, off + 4) / 1000,
        // the number of descriptor bytes (allows later expansion of this header)
        descriptorBytes: Token.UINT32_LE.get(buf, off + 8),
        // the number of header APE_HEADER bytes
        headerBytes: Token.UINT32_LE.get(buf, off + 12),
        // the number of header APE_HEADER bytes
        seekTableBytes: Token.UINT32_LE.get(buf, off + 16),
        // the number of header data bytes (from original file)
        headerDataBytes: Token.UINT32_LE.get(buf, off + 20),
        // the number of bytes of APE frame data
        apeFrameDataBytes: Token.UINT32_LE.get(buf, off + 24),
        // the high order number of APE frame data bytes
        apeFrameDataBytesHigh: Token.UINT32_LE.get(buf, off + 28),
        // the terminating data of the file (not including tag data)
        terminatingDataBytes: Token.UINT32_LE.get(buf, off + 32),
        // the MD5 hash of the file (see notes for usage... it's a littly tricky)
        fileMD5: new Token.BufferType(16).get(buf, off + 36)
      };
    }
  };

  /**
   * APE_HEADER: describes all of the necessary information about the APE file
   */
  public static Header = {
    len: 24,

    get: (buf, off) => {
      return {
        // the compression level (see defines I.E. COMPRESSION_LEVEL_FAST)
        compressionLevel: Token.UINT16_LE.get(buf, off),
        // any format flags (for future use)
        formatFlags: Token.UINT16_LE.get(buf, off + 2),
        // the number of audio blocks in one frame
        blocksPerFrame: Token.UINT32_LE.get(buf, off + 4),
        // the number of audio blocks in the final frame
        finalFrameBlocks: Token.UINT32_LE.get(buf, off + 8),
        // the total number of frames
        totalFrames: Token.UINT32_LE.get(buf, off + 12),
        // the bits per sample (typically 16)
        bitsPerSample: Token.UINT16_LE.get(buf, off + 16),
        // the number of channels (1 or 2)
        channel: Token.UINT16_LE.get(buf, off + 18),
        // the sample rate (typically 44100)
        sampleRate: Token.UINT32_LE.get(buf, off + 20)
      };
    }
  };

  /**
   * TAG: describes all the properties of the file [optional]
   */
  public static TagFooter: Token.IGetToken<IFooter> = {
    len: 32,

    get: (buf, off) => {
      return {
        // should equal 'APETAGEX'
        ID: new Token.StringType(8, "ascii").get(buf, off),
        // equals CURRENT_APE_TAG_VERSION
        version: Token.UINT32_LE.get(buf, off + 8),
        // the complete size of the tag, including this footer (excludes header)
        size: Token.UINT32_LE.get(buf, off + 12),
        // the number of fields in the tag
        fields: Token.UINT32_LE.get(buf, off + 16),
        // reserved for later use (must be zero)
        reserved: new Token.BufferType(12).get(buf, off + 20) // ToDo: what is this???
      };
    }
  };

  public static TagField = footer => {
    return new Token.BufferType(footer.size - Structure.TagFooter.len);
  }

  public static parseTagFlags(flags): ITagFlags {
    return {
      containsHeader: Structure.isBitSet(flags, 31),
      containsFooter: Structure.isBitSet(flags, 30),
      isHeader: Structure.isBitSet(flags, 31),
      readOnly: Structure.isBitSet(flags, 0),
      dataType: (flags & 6) >> 1
    };
  }

  /**
   * @param num {number}
   * @param bit 0 is least significant bit (LSB)
   * @return {boolean} true if bit is 1; otherwise false
   */
  public static isBitSet(num, bit): boolean {
    return (num & 1 << bit) !== 0;
  }

}

interface IApeInfo {
  descriptor?: IDescriptor,
  header?: IHeader,
  footer?: IFooter
}

export class APEv2Parser implements ITokenParser {

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

  public static parseFooter(tokenizer: ITokenizer, options: IOptions): Promise<Array<{ id: string, value: any }>> {
    return tokenizer.readToken<IFooter>(Structure.TagFooter).then(footer => {
      if (footer.ID !== "APETAGEX") {
        throw new Error("Expected footer to start with APETAGEX ");
      }
      return tokenizer.readToken<Buffer>(Structure.TagField(footer)).then(tags => {
        return APEv2Parser.parseTags(footer, tags, !options.skipCovers);
      });
    });
  }

  // ToDo: public ???
  private static parseTags(footer: IFooter, buffer: Buffer, includeCovers: boolean): Array<{ id: string, value: any }> {
    let offset = 0;

    const tags: Array<{ id: string, value: any }> = [];

    for (let i = 0; i < footer.fields; i++) {
      const size = Token.UINT32_LE.get(buffer, offset);
      offset += 4;
      const flags = Structure.parseTagFlags(Token.UINT32_LE.get(buffer, offset));
      offset += 4;

      let zero = common.findZero(buffer, offset, buffer.length);
      const key = buffer.toString("ascii", offset, zero);
      offset = zero + 1;

      switch (flags.dataType) {
        case DataType.text_utf8: { // utf-8 textstring
          const value = buffer.toString("utf8", offset, offset += size);
          const values = value.split(/\x00/g);

          /*jshint loopfunc:true */
          for (const val of values) {
            tags.push({id: key, value: val});
          }
          break;
        }

        case DataType.binary: // binary (probably artwork)
          if (includeCovers) {
            const picData = buffer.slice(offset, offset + size);

            let off = 0;
            zero = common.findZero(picData, off, picData.length);
            const description = picData.toString("utf8", off, zero);
            off = zero + 1;

            const data = Buffer.from(picData.slice(off));
            const fileType = FileType(data);

            if (fileType) {
              if (fileType.mime.indexOf('image/') === 0) {
                const picture: IPicture = {
                  description,
                  data,
                  format: fileType.ext
                };

                offset += size;
                tags.push({id: key, value: picture});
              } else {
                debug('Unexpected binary tag of type ' + fileType.mime);
              }
            } else {
              debug('Failed to determine file type for binary tag: ' + key);
            }
          }
          break;

        default:
          throw new Error("Unexpected data-type: " + flags.dataType);
      }
    }
    return tags;
  }

  private type: TagType = "APEv2"; // ToDo: versionIndex should be made dynamic, APE may also contain ID3

  private ape: IApeInfo = {};

  private tokenizer: ITokenizer;
  private options: IOptions;

  public parse(tokenizer: ITokenizer, options: IOptions): Promise<INativeAudioMetadata> {

    this.tokenizer = tokenizer;
    this.options = options;

    return this.tokenizer.readToken(Structure.DescriptorParser)
      .then(descriptor => {
        if (descriptor.ID !== "MAC ") {
          throw new Error("Expected MAC on beginning of file"); // ToDo: strip/parse JUNK
        }
        this.ape.descriptor = descriptor;
        const lenExp = descriptor.descriptorBytes - Structure.DescriptorParser.len;
        if (lenExp > 0) {
          return this.parseDescriptorExpansion(lenExp);
        } else {
          return this.parseHeader();
        }
      }).then(header => {
        return this.tokenizer.readToken(new IgnoreType(header.forwardBytes)).then(() => {
          return APEv2Parser.parseFooter(tokenizer, options).then(tags => {
            return {
              format: header.format,
              native: {
                APEv2: tags
              }
            };
          });
        });
      });

  }

  private parseDescriptorExpansion(lenExp: number): Promise<{ format: IFormat, forwardBytes: number }> {
    return this.tokenizer.readToken(new IgnoreType(lenExp)).then(() => {
      return this.parseHeader();
    });
  }

  private parseHeader(): Promise<{ format: IFormat, forwardBytes: number }> {
    return this.tokenizer.readToken(Structure.Header).then(header => {
      return {
        format: {
          lossless: true,
          headerType: this.type,
          bitsPerSample: header.bitsPerSample,
          sampleRate: header.sampleRate,
          numberOfChannels: header.channel,
          duration: APEv2Parser.calculateDuration(header)
        },
        forwardBytes: this.ape.descriptor.seekTableBytes + this.ape.descriptor.headerDataBytes +
        this.ape.descriptor.apeFrameDataBytes + this.ape.descriptor.terminatingDataBytes
      };
    });
  }

}
