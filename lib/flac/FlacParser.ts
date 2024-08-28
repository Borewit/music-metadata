import { UINT16_BE, UINT24_BE, Uint8ArrayType } from 'token-types';
import initDebug from 'debug';
import type { IGetToken } from 'strtok3';

import * as util from '../common/Util.js';
import { type IVorbisPicture, VorbisPictureToken } from '../ogg/vorbis/Vorbis.js';
import { AbstractID3Parser } from '../id3v2/AbstractID3Parser.js';
import { FourCcToken } from '../common/FourCC.js';
import { VorbisParser } from '../ogg/vorbis/VorbisParser.js';
import { VorbisDecoder } from '../ogg/vorbis/VorbisDecoder.js';
import { makeUnexpectedFileContentError } from '../ParseError.js';

const debug = initDebug('music-metadata:parser:FLAC');

class FlacContentError extends makeUnexpectedFileContentError('FLAC'){
}

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

export class FlacParser extends AbstractID3Parser {

  private vorbisParser = new VorbisParser(this.metadata, this.options);

  private padding = 0;

  public async postId3v2Parse(): Promise<void> {

    const fourCC = await this.tokenizer.readToken<string>(FourCcToken);
    if (fourCC.toString() !== 'fLaC') {
      throw new FlacContentError('Invalid FLAC preamble');
    }

    let blockHeader: IBlockHeader;
    do {
      // Read block header
      blockHeader = await this.tokenizer.readToken<IBlockHeader>(BlockHeader);
      // Parse block data
      await this.parseDataBlock(blockHeader);
    }
    while (!blockHeader.lastBlock);

    if (this.tokenizer.fileInfo.size && this.metadata.format.duration) {
      const dataSize = this.tokenizer.fileInfo.size - this.tokenizer.position;
      this.metadata.setFormat('bitrate', 8 * dataSize / this.metadata.format.duration);
    }
  }

  private async parseDataBlock(blockHeader: IBlockHeader): Promise<void> {
    debug(`blockHeader type=${blockHeader.type}, length=${blockHeader.length}`);
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
        await this.parsePicture(blockHeader.length);
        return;
      default:
        this.metadata.addWarning(`Unknown block type: ${blockHeader.type}`);
    }
    // Ignore data block
    return this.tokenizer.ignore(blockHeader.length).then();
  }

  /**
   * Parse STREAMINFO
   */
  private async parseBlockStreamInfo(dataLen: number): Promise<void> {

    if (dataLen !== BlockStreamInfo.len)
      throw new FlacContentError('Unexpected block-stream-info length');

    const streamInfo = await this.tokenizer.readToken<IBlockStreamInfo>(BlockStreamInfo);
    this.metadata.setFormat('container', 'FLAC');
    this.metadata.setFormat('codec', 'FLAC');
    this.metadata.setFormat('lossless', true);
    this.metadata.setFormat('numberOfChannels', streamInfo.channels);
    this.metadata.setFormat('bitsPerSample', streamInfo.bitsPerSample);
    this.metadata.setFormat('sampleRate', streamInfo.sampleRate);
    if (streamInfo.totalSamples > 0) {
      this.metadata.setFormat('duration', streamInfo.totalSamples / streamInfo.sampleRate);
    }
  }

  /**
   * Parse VORBIS_COMMENT
   * Ref: https://www.xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-640004.2.3
   */
  private async parseComment(dataLen: number): Promise<void> {
    const data = await this.tokenizer.readToken<Uint8Array>(new Uint8ArrayType(dataLen));
    const decoder = new VorbisDecoder(data, 0);
    decoder.readStringUtf8(); // vendor (skip)
    const commentListLength = decoder.readInt32();
    const tags = new Array(commentListLength);
    for (let i = 0; i < commentListLength; i++) {
      tags[i] = decoder.parseUserComment();
    }
    await Promise.all(tags.map(tag => (this.vorbisParser as VorbisParser).addTag(tag.key, tag.value)));
  }

  private async parsePicture(dataLen: number) {
    if (this.options.skipCovers) {
      return this.tokenizer.ignore(dataLen);
    }
      const picture = await this.tokenizer.readToken<IVorbisPicture>(new VorbisPictureToken(dataLen));
      (this.vorbisParser as VorbisParser).addTag('METADATA_BLOCK_PICTURE', picture);
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
  fileMD5: Uint8Array;
}

const BlockHeader: IGetToken<IBlockHeader> = {
  len: 4,

  get: (buf: Uint8Array, off: number): IBlockHeader => {
    return {
      lastBlock: util.getBit(buf, off, 7),
      type: util.getBitAllignedNumber(buf, off, 1, 7),
      length: UINT24_BE.get(buf, off + 1)
    };
  }
};

/**
 * METADATA_BLOCK_DATA
 * Ref: https://xiph.org/flac/format.html#metadata_block_streaminfo
 */
const BlockStreamInfo: IGetToken<IBlockStreamInfo> = {
  len: 34,

  get: (buf: Uint8Array, off: number): IBlockStreamInfo => {
    return {
      // The minimum block size (in samples) used in the stream.
      minimumBlockSize: UINT16_BE.get(buf, off),
      // The maximum block size (in samples) used in the stream.
      // (Minimum blocksize == maximum blocksize) implies a fixed-blocksize stream.
      maximumBlockSize: UINT16_BE.get(buf, off + 2) / 1000,
      // The minimum frame size (in bytes) used in the stream.
      // May be 0 to imply the value is not known.
      minimumFrameSize: UINT24_BE.get(buf, off + 4),
      // The maximum frame size (in bytes) used in the stream.
      // May be 0 to imply the value is not known.
      maximumFrameSize: UINT24_BE.get(buf, off + 7),
      // Sample rate in Hz. Though 20 bits are available,
      // the maximum sample rate is limited by the structure of frame headers to 655350Hz.
      // Also, a value of 0 is invalid.
      sampleRate: UINT24_BE.get(buf, off + 10) >> 4,
      // probably slower: sampleRate: common.getBitAllignedNumber(buf, off + 10, 0, 20),
      // (number of channels)-1. FLAC supports from 1 to 8 channels
      channels: util.getBitAllignedNumber(buf, off + 12, 4, 3) + 1,
      // bits per sample)-1.
      // FLAC supports from 4 to 32 bits per sample. Currently the reference encoder and decoders only support up to 24 bits per sample.
      bitsPerSample: util.getBitAllignedNumber(buf, off + 12, 7, 5) + 1,
      // Total samples in stream.
      // 'Samples' means inter-channel sample, i.e. one second of 44.1Khz audio will have 44100 samples regardless of the number of channels.
      // A value of zero here means the number of total samples is unknown.
      totalSamples: util.getBitAllignedNumber(buf, off + 13, 4, 36),
      // the MD5 hash of the file (see notes for usage... it's a littly tricky)
      fileMD5: new Uint8ArrayType(16).get(buf, off + 18)
    };
  }
};
