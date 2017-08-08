'use strict';

import common from '../common';
import {INativeAudioMetadata, IOptions, ITag, IFormat} from "../index";
import {ITokenParser} from "../ParserFactory";
import {ITokenizer, IgnoreType} from "strtok3";
import * as Token from "token-types";
import {IVorbisPicture, VorbisPictureToken} from "../vorbis/Vorbis";

/**
 * FLAC supports up to 128 kinds of metadata blocks; currently the following are defined:
 * ref: https://xiph.org/flac/format.html#metadata_block
 */
enum BlockType {
  STREAMINFO = 0,
  PADDING = 1,
  APPLICATION = 2,
  SEEKTABLE = 3,
  VORBIS_COMMENT = 4,
  CUESHEET = 5,
  PICTURE = 6
}

export class FlacParser implements ITokenParser {

  public static getInstance(): FlacParser {
    return new FlacParser();
  }

  private tokenizer: ITokenizer;
  private options: IOptions;

  private format: IFormat;
  private tags: ITag[] = [];
  private padding: number = 0;
  private warnings: string[] = []; // ToDo: should be part of the parsing result

  public parse(tokenizer: ITokenizer, options: IOptions): Promise<INativeAudioMetadata> {

    this.tokenizer = tokenizer;
    this.options = options;

    return tokenizer.readToken<Buffer>(new Token.BufferType(4)).then((buf) => {
      if (buf.toString() !== 'fLaC') {
        throw new Error('expected flac header but was not found');
      }
      return this.parseBlockHeader();
    });
  }

  private parseBlockHeader(): Promise<INativeAudioMetadata> {
    // Read block header
    return this.tokenizer.readToken<IBlockHeader>(Metadata.BlockHeader).then((blockHeader) => {
      // Parse block data
      return this.parseDataBlock(blockHeader).then(() => {
        if (blockHeader.lastBlock) {
          // done
          return {
            format: this.format,
            native: {
              vorbis: this.tags
            }
          };
        } else {
          return this.parseBlockHeader();
        }
      });
    });
  }

  private parseDataBlock(blockHeader: IBlockHeader): Promise<void> {
    switch (blockHeader.type) {
      case BlockType.STREAMINFO:
        return this.parseBlockStreamInfo(blockHeader.length);
      case BlockType.PADDING:
        this.padding += blockHeader.length;
        break;
      case BlockType.APPLICATION:
        break;
      case BlockType.SEEKTABLE:
        break;
      case BlockType.VORBIS_COMMENT:
        return this.parseComment(blockHeader.length);
      case BlockType.CUESHEET:
        break;
      case BlockType.PICTURE:
        return this.parsePicture(blockHeader.length);
      default:
        this.warnings.push("Unknown block type: " + blockHeader.type);
    }
    // Ignore data block
    return this.tokenizer.readToken<void>(new IgnoreType(blockHeader.length));
  }

  /**
   * Parse STREAMINFO
   */
  private parseBlockStreamInfo(dataLen: number): Promise<void> {

    if (dataLen !== Metadata.BlockStreamInfo.len)
      throw new Error("Unexpected block-stream-info length");

    return this.tokenizer.readToken<IBlockStreamInfo>(Metadata.BlockStreamInfo).then((streamInfo) => {
      this.format = {
        dataformat: 'flac',
        lossless: true,
        headerType: 'vorbis',
        numberOfChannels: streamInfo.channels,
        bitsPerSample: streamInfo.bitsPerSample,
        sampleRate: streamInfo.sampleRate,
        duration: streamInfo.totalSamples / streamInfo.sampleRate
      };
      // callback('format', 'bitrate', fileSize / duration) // ToDo: exclude meta-data
    });
  }

  /**
   * Parse VORBIS_COMMENT
   * Ref: https://www.xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-640004.2.3
   */
  private parseComment(dataLen: number): Promise<void> {
    return this.tokenizer.readToken<Buffer>(new Token.BufferType(dataLen)).then((data) => {
      const decoder = new DataDecoder(data);
      decoder.readStringUtf8(); // vendor (skip)
      const commentListLength = decoder.readInt32();
      for (let i = 0; i < commentListLength; i++) {
        const comment = decoder.readStringUtf8();
        const split = comment.split('=');
        this.tags.push({id: split[0].toUpperCase(), value: split[1]});
      }
    });
  }

  private parsePicture(dataLen: number) {
    if (this.options.skipCovers) {
      return this.tokenizer.ignore(dataLen);
    } else {
      return this.tokenizer.readToken<IVorbisPicture>(new VorbisPictureToken(dataLen)).then((picture) => {
        this.tags.push({id: 'METADATA_BLOCK_PICTURE', value: picture});
      });
    }
  }
}

/**
 * METADATA_BLOCK_DATA
 * Ref: https://xiph.org/flac/format.html#metadata_block_streaminfo
 */
interface IBlockHeader {
  // Last-metadata-block flag: '1' if this block is the last metadata block before the audio blocks, '0' otherwise.
  lastBlock: boolean,
  // BLOCK_TYPE
  type: BlockType,
  // Length (in bytes) of metadata to follow (does not include the size of the METADATA_BLOCK_HEADER)
  length: number;
}

/**
 * METADATA_BLOCK_DATA
 * Ref: https://xiph.org/flac/format.html#metadata_block_streaminfo
 */
interface IBlockStreamInfo {
  minimumBlockSize: number,
  // The maximum block size (in samples) used in the stream.
  // (Minimum blocksize == maximum blocksize) implies a fixed-blocksize stream.
  maximumBlockSize: number,
  // The minimum frame size (in bytes) used in the stream.
  // May be 0 to imply the value is not known.
  minimumFrameSize: number,
  // The maximum frame size (in bytes) used in the stream.
  // May be 0 to imply the value is not known.
  maximumFrameSize: number,
  // Sample rate in Hz. Though 20 bits are available,
  // the maximum sample rate is limited by the structure of frame headers to 655350Hz.
  // Also, a value of 0 is invalid.
  sampleRate: number,
  // probably slower: sampleRate: common.getBitAllignedNumber(buf, off + 10, 0, 20),
  // (number of channels)-1. FLAC supports from 1 to 8 channels
  channels: number,
  // bits per sample)-1.
  // FLAC supports from 4 to 32 bits per sample. Currently the reference encoder and decoders only support up to 24 bits per sample.
  bitsPerSample: number,
  // Total samples in stream.
  // 'Samples' means inter-channel sample, i.e. one second of 44.1Khz audio will have 44100 samples regardless of the number of channels.
  // A value of zero here means the number of total samples is unknown.
  totalSamples: number,
  // the MD5 hash of the file (see notes for usage... it's a littly tricky)
  fileMD5: Buffer;
}

class Metadata {

  public static BlockHeader: Token.IGetToken<IBlockHeader> = {
    len: 4,

    get: (buf: Buffer, off: number): IBlockHeader => {
      return {
        lastBlock: common.strtokBITSET.get(buf, off, 7),
        type: common.getBitAllignedNumber(buf, off, 1, 7),
        length: common.strtokUINT24_BE.get(buf, off + 1)
      };
    }
  };

  /**
   * METADATA_BLOCK_DATA
   * Ref: https://xiph.org/flac/format.html#metadata_block_streaminfo
   */
  public static BlockStreamInfo: Token.IGetToken<IBlockStreamInfo> = {
    len: 34,

    get: (buf: Buffer, off: number): IBlockStreamInfo => {
      return {
        // The minimum block size (in samples) used in the stream.
        minimumBlockSize: Token.UINT16_BE.get(buf, off),
        // The maximum block size (in samples) used in the stream.
        // (Minimum blocksize == maximum blocksize) implies a fixed-blocksize stream.
        maximumBlockSize: Token.UINT16_BE.get(buf, off + 2) / 1000,
        // The minimum frame size (in bytes) used in the stream.
        // May be 0 to imply the value is not known.
        minimumFrameSize: Token.UINT24_BE.get(buf, off + 4),
        // The maximum frame size (in bytes) used in the stream.
        // May be 0 to imply the value is not known.
        maximumFrameSize: Token.UINT24_BE.get(buf, off + 7),
        // Sample rate in Hz. Though 20 bits are available,
        // the maximum sample rate is limited by the structure of frame headers to 655350Hz.
        // Also, a value of 0 is invalid.
        sampleRate: common.strtokUINT24_BE.get(buf, off + 10) >> 4,
        // probably slower: sampleRate: common.getBitAllignedNumber(buf, off + 10, 0, 20),
        // (number of channels)-1. FLAC supports from 1 to 8 channels
        channels: common.getBitAllignedNumber(buf, off + 12, 4, 3) + 1,
        // bits per sample)-1.
        // FLAC supports from 4 to 32 bits per sample. Currently the reference encoder and decoders only support up to 24 bits per sample.
        bitsPerSample: common.getBitAllignedNumber(buf, off + 12, 7, 5) + 1,
        // Total samples in stream.
        // 'Samples' means inter-channel sample, i.e. one second of 44.1Khz audio will have 44100 samples regardless of the number of channels.
        // A value of zero here means the number of total samples is unknown.
        totalSamples: common.getBitAllignedNumber(buf, off + 13, 4, 36),
        // the MD5 hash of the file (see notes for usage... it's a littly tricky)
        fileMD5: new Token.BufferType(16).get(buf, off + 18)
      };
    }
  };
}

class DataDecoder {

  private data: Buffer;
  private offset: number;

  constructor(data: Buffer) {
    this.data = data;
    this.offset = 0;
  }

  public readInt32(): number {
    const value = Token.UINT32_LE.get(this.data, this.offset);
    this.offset += 4;
    return value;
  }

  public readStringUtf8(): string {
    const len = this.readInt32();
    const value = this.data.toString('utf8', this.offset, this.offset + len);
    this.offset += len;
    return value;
  }
}
