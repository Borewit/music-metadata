import initDebug from 'debug';
import { Uint8ArrayType } from 'token-types';
import { type IVorbisPicture, VorbisPictureToken } from '../ogg/vorbis/Vorbis.js';
import { AbstractID3Parser } from '../id3v2/AbstractID3Parser.js';
import { FourCcToken } from '../common/FourCC.js';
import { VorbisStream } from '../ogg/vorbis/VorbisStream.js';
import { VorbisDecoder } from '../ogg/vorbis/VorbisDecoder.js';
import { makeUnexpectedFileContentError } from '../ParseError.js';
import * as Flac from './FlacToken.js';
import type { IBlockStreamInfo } from './FlacToken.js';

const debug = initDebug('music-metadata:parser:FLAC');

class FlacContentError extends makeUnexpectedFileContentError('FLAC'){
}


export class FlacParser extends AbstractID3Parser {

  private vorbisParser = new VorbisStream(this.metadata, this.options);

  public async postId3v2Parse(): Promise<void> {

    const fourCC = await this.tokenizer.readToken<string>(FourCcToken);
    if (fourCC.toString() !== 'fLaC') {
      throw new FlacContentError('Invalid FLAC preamble');
    }

    let blockHeader: Flac.IBlockHeader;
    do {
      // Read block header
      blockHeader = await this.tokenizer.readToken(Flac.BlockHeader);
      // Parse block data
      await this.parseDataBlock(blockHeader);
    }
    while (!blockHeader.lastBlock);

    if (this.tokenizer.fileInfo.size && this.metadata.format.duration) {
      const dataSize = this.tokenizer.fileInfo.size - this.tokenizer.position;
      this.metadata.setFormat('bitrate', 8 * dataSize / this.metadata.format.duration);
    }
  }

  private async parseDataBlock(blockHeader: Flac.IBlockHeader): Promise<void> {
    debug(`blockHeader type=${blockHeader.type}, length=${blockHeader.length}`);
    switch (blockHeader.type) {
      case Flac.BlockType.STREAMINFO:
        return this.readBlockStreamInfo(blockHeader.length);
      case Flac.BlockType.PADDING:
         break;
      case Flac.BlockType.APPLICATION:
        break;
      case Flac.BlockType.SEEKTABLE:
        break;
      case Flac.BlockType.VORBIS_COMMENT:
        return this.readComment(blockHeader.length);
      case Flac.BlockType.CUESHEET:
        break;
      case Flac.BlockType.PICTURE:
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
  private async readBlockStreamInfo(dataLen: number): Promise<void> {

    if (dataLen !== Flac.BlockStreamInfo.len)
      throw new FlacContentError('Unexpected block-stream-info length');

    const streamInfo = await this.tokenizer.readToken(Flac.BlockStreamInfo);
    this.metadata.setFormat('container', 'FLAC');
    this.processsStreamInfo(streamInfo);
  }

  /**
   * Parse STREAMINFO
   */
  public processsStreamInfo(streamInfo: IBlockStreamInfo): void {
    this.metadata.setFormat('codec', 'FLAC');
    this.metadata.setFormat('hasAudio', true);
    this.metadata.setFormat('lossless', true);
    this.metadata.setFormat('numberOfChannels', streamInfo.channels);
    this.metadata.setFormat('bitsPerSample', streamInfo.bitsPerSample);
    this.metadata.setFormat('sampleRate', streamInfo.sampleRate);
    if (streamInfo.totalSamples > 0) {
      this.metadata.setFormat('duration', streamInfo.totalSamples / streamInfo.sampleRate);
    }
  }

  /**
   * Read VORBIS_COMMENT from tokenizer
   * Ref: https://www.xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-640004.2.3
   */
  private async readComment(dataLen: number): Promise<void> {
    const data = await this.tokenizer.readToken(new Uint8ArrayType(dataLen));
    return this.parseComment(data);
  }

  /**
   * Parse VORBIS_COMMENT
   * Ref: https://www.xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-640004.2.3
   */
  public async parseComment(data: Uint8Array): Promise<void> {
    const decoder = new VorbisDecoder(data, 0);
    const vendor = decoder.readStringUtf8();
    if (vendor.length > 0) {
      this.metadata.setFormat('tool', vendor);
    }
    const commentListLength = decoder.readInt32();
    const tags = new Array(commentListLength);
    for (let i = 0; i < commentListLength; i++) {
      tags[i] = decoder.parseUserComment();
    }
    await Promise.all(tags.map(tag => {
      if (tag.key==='ENCODER') {
        this.metadata.setFormat('tool', tag.value);
      }
      return this.addTag(tag.key, tag.value);
    }));
  }

  private async parsePicture(dataLen: number) {
    if (this.options.skipCovers) {
      return this.tokenizer.ignore(dataLen);
    }
    return this.addPictureTag(await this.tokenizer.readToken(new VorbisPictureToken(dataLen)));
  }

  public addPictureTag(picture: IVorbisPicture): Promise<void> {
    return this.addTag('METADATA_BLOCK_PICTURE', picture);
  }

  private addTag(id: string, value: string | IVorbisPicture): Promise<void> {
    return this.vorbisParser.addTag(id, value);
  }
}
