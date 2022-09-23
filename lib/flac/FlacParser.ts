import { FourCcToken } from "../common/FourCC";
import initDebug from "../debug";
import { AbstractID3Parser } from "../id3v2/AbstractID3Parser";
import { VorbisDecoder } from "../ogg/vorbis/VorbisDecoder";
import { VorbisParser } from "../ogg/vorbis/VorbisParser";
import { IVorbisPicture, VorbisPictureToken } from "../ogg/vorbis/VorbisPicture";
import { Uint8ArrayType } from "../token-types";

import { BlockHeader, IBlockHeader } from "./BlockHeader";
import { BlockStreamInfo, IBlockStreamInfo } from "./BlockStreamInfo";
import { BlockType } from "./BlockType";

import type { INativeMetadataCollector } from "../common/INativeMetadataCollector";
import type { ITokenParser } from "../ParserFactory";
import type { ITokenizer } from "../strtok3/types";
import type { IOptions } from "../type";

const debug = initDebug("music-metadata:parser:FLAC");

export class FlacParser extends AbstractID3Parser {
  private vorbisParser: VorbisParser;

  private padding = 0;

  /**
   * Initialize parser with output (metadata), input (tokenizer) & parsing options (options).
   * @param {INativeMetadataCollector} metadata Output
   * @param {ITokenizer} tokenizer Input
   * @param {IOptions} options Parsing options
   * @returns
   */
  public override init(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions): ITokenParser {
    super.init(metadata, tokenizer, options);
    this.vorbisParser = new VorbisParser(metadata, options);
    return this;
  }

  public async postId3v2Parse(): Promise<void> {
    const fourCC = await this.tokenizer.readToken<string>(FourCcToken);
    if (fourCC.toString() !== "fLaC") {
      throw new Error("Invalid FLAC preamble");
    }

    let blockHeader: IBlockHeader;
    do {
      // Read block header
      blockHeader = await this.tokenizer.readToken<IBlockHeader>(BlockHeader);
      // Parse block data
      await this.parseDataBlock(blockHeader);
    } while (!blockHeader.lastBlock);

    if (this.tokenizer.fileInfo.size > 0 && this.metadata.format.duration) {
      const dataSize = this.tokenizer.fileInfo.size - this.tokenizer.position;
      this.metadata.setFormat("bitrate", (8 * dataSize) / this.metadata.format.duration);
    }
  }

  private parseDataBlock(blockHeader: IBlockHeader): Promise<void> {
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
        return this.parsePicture(blockHeader.length).then();
      default:
        this.metadata.addWarning(`Unknown block type: ${blockHeader.type as unknown as string}`);
    }
    // Ignore data block
    return this.tokenizer.ignore(blockHeader.length).then();
  }

  /**
   * Parse STREAMINFO
   * @param dataLen
   */
  private async parseBlockStreamInfo(dataLen: number): Promise<void> {
    if (dataLen !== BlockStreamInfo.len) throw new Error("Unexpected block-stream-info length");

    const streamInfo = await this.tokenizer.readToken<IBlockStreamInfo>(BlockStreamInfo);
    this.metadata.setFormat("container", "FLAC");
    this.metadata.setFormat("codec", "FLAC");
    this.metadata.setFormat("lossless", true);
    this.metadata.setFormat("numberOfChannels", streamInfo.channels);
    this.metadata.setFormat("bitsPerSample", streamInfo.bitsPerSample);
    this.metadata.setFormat("sampleRate", streamInfo.sampleRate);
    if (streamInfo.totalSamples > 0) {
      this.metadata.setFormat("duration", streamInfo.totalSamples / streamInfo.sampleRate);
    }
  }

  /**
   * Parse VORBIS_COMMENT
   * Ref: https://www.xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-640004.2.3
   * @param dataLen
   */
  private async parseComment(dataLen: number): Promise<void> {
    const data = await this.tokenizer.readToken<Uint8Array>(new Uint8ArrayType(dataLen));
    const decoder = new VorbisDecoder(data, 0);
    decoder.readStringUtf8(); // vendor (skip)
    const commentListLength = decoder.readInt32();
    for (let i = 0; i < commentListLength; i++) {
      const tag = decoder.parseUserComment();
      this.vorbisParser.addTag(tag.key, tag.value);
    }
  }

  private async parsePicture(dataLen: number) {
    if (this.options.skipCovers) {
      return this.tokenizer.ignore(dataLen);
    } else {
      const picture = await this.tokenizer.readToken<IVorbisPicture>(new VorbisPictureToken(dataLen));
      this.vorbisParser.addTag("METADATA_BLOCK_PICTURE", picture);
    }
  }
}
