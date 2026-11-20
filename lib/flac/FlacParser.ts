import type { IGetToken } from '@tokenizer/token';
import initDebug from 'debug';
import { EndOfStreamError, type IRandomAccessTokenizer, isRandomAccessTokenizer } from 'strtok3';
import { Uint8ArrayType } from 'token-types';
import { getMaxMemoryAllocation, getMaxMetadataEntries, validateAllocation } from '../common/Allocation.js';
import { FourCcToken } from '../common/FourCC.js';
import { AbstractID3Parser } from '../id3v2/AbstractID3Parser.js';
import { type IVorbisPicture, VorbisPictureToken } from '../ogg/vorbis/Vorbis.js';
import { VorbisDecoder } from '../ogg/vorbis/VorbisDecoder.js';
import { VorbisStream } from '../ogg/vorbis/VorbisStream.js';
import { makeUnexpectedFileContentError } from '../ParseError.js';
import type { IBlockStreamInfo } from './FlacToken.js';
import * as Flac from './FlacToken.js';

const debug = initDebug('music-metadata:parser:FLAC');

class FlacContentError extends makeUnexpectedFileContentError('FLAC') {}

export class FlacParser extends AbstractID3Parser {
  private vorbisParser = new VorbisStream(this.metadata, this.options);

  private streamInfo: IBlockStreamInfo | undefined;

  private metadataBuffer?: {
    tokenizer: IRandomAccessTokenizer;
    data: Uint8Array;
    position: number;
    length: number;
  };

  public async postId3v2Parse(): Promise<void> {
    // Coalesce small metadata reads without making streams wait for bytes past
    // the metadata. A modest window avoids rereading much of a large picture.
    if (isRandomAccessTokenizer(this.tokenizer)) {
      this.metadataBuffer = {
        tokenizer: this.tokenizer,
        data: new Uint8Array(Math.min(4096, getMaxMemoryAllocation(this.options))),
        position: this.tokenizer.position,
        length: 0
      };
    }
    const fourCC = await this.readToken<string>(FourCcToken);
    if (fourCC.toString() !== 'fLaC') {
      throw new FlacContentError('Invalid FLAC preamble');
    }

    let blockHeader: Flac.IBlockHeader;
    do {
      // Read block header
      blockHeader = await this.readToken(Flac.BlockHeader);
      // Parse block data
      await this.parseDataBlock(blockHeader);
    } while (!blockHeader.lastBlock);

    this.metadataBuffer = undefined;
    const audioOffset = this.tokenizer.position;
    // Duration scan: recover sample extent from FLAC frame headers when STREAMINFO
    // totalSamples is unknown (0) and duration was explicitly requested.
    if (this.options.duration && !this.metadata.format.duration && this.streamInfo) {
      try {
        await this.scanFramesForDuration();
      } finally {
        // Leave trailing tags available to the post-header parser on seekable inputs.
        if (isRandomAccessTokenizer(this.tokenizer)) {
          this.tokenizer.setPosition(audioOffset);
        }
      }
    }
    if (this.tokenizer.fileInfo.size && this.metadata.format.duration) {
      const dataSize = this.tokenizer.fileInfo.size - audioOffset;
      this.metadata.setFormat('bitrate', (8 * dataSize) / this.metadata.format.duration);
    }
  }

  protected override async readToken<T>(token: IGetToken<T>, position?: number): Promise<T> {
    const cache = this.metadataBuffer;
    if (!cache || position !== undefined || token.len > cache.data.length) {
      return super.readToken(token, position);
    }
    validateAllocation(token.len, this.options);
    const fileSize = this.tokenizer.fileInfo.size;
    if (fileSize !== undefined && token.len > fileSize - this.tokenizer.position) {
      throw new EndOfStreamError();
    }
    let offset = this.tokenizer.position - cache.position;
    if (offset < 0 || offset + token.len > cache.length) {
      cache.position = this.tokenizer.position;
      cache.length = await this.tokenizer.peekBuffer(cache.data, {
        length: Math.min(cache.data.length, fileSize === undefined ? cache.data.length : fileSize - cache.position),
        mayBeLess: true
      });
      if (cache.length < token.len) {
        // Preserve ordinary token-read EOF handling on truncated input.
        return super.readToken(token, position);
      }
      offset = 0;
    }
    // Only advance over bytes whose presence the peek has already established.
    cache.tokenizer.setPosition(this.tokenizer.position + token.len);
    return token.get(cache.data, offset);
  }

  /**
   * Scan FLAC audio frames to recover the total sample count when STREAMINFO
   * totalSamples is zero. Walks frame headers looking for valid sync codes and
   * CRC-8, tracking the last frame number / coded sample number. Gated behind
   * `duration: true`; traverses the remaining input, including streams of unknown size.
   */
  private async scanFramesForDuration(): Promise<void> {
    const sampleRate = this.metadata.format.sampleRate;
    const streamInfo = this.streamInfo;
    if (!sampleRate || !streamInfo) {
      return;
    }

    const fixedBlockSize =
      streamInfo.minimumBlockSize > 0 && streamInfo.minimumBlockSize === streamInfo.maximumBlockSize
        ? streamInfo.minimumBlockSize
        : undefined;

    let lastFrameNumber = -1;
    let lastCodedSampleNumber = -1;
    let frameBlockSize: number | undefined;
    let nominalBlockSize = fixedBlockSize;
    let blockingStrategy = false;
    let frameCount = 0;

    // A header is at most 16 bytes: 4 fixed, 7 coded-number, 2 block-size,
    // 2 sample-rate and 1 CRC. Retain 15 bytes to cover every chunk boundary.
    const overlap = 15;
    const data = new Uint8Array(Math.min(64 * 1024, getMaxMemoryAllocation(this.options)));
    let retained = 0;
    while (true) {
      const remaining =
        this.tokenizer.fileInfo.size === undefined
          ? data.length - retained
          : Math.max(0, this.tokenizer.fileInfo.size - this.tokenizer.position);
      const read = await this.tokenizer.readBuffer(data.subarray(retained), {
        length: Math.min(data.length - retained, remaining),
        mayBeLess: true
      });
      const atEnd = read === 0 || this.tokenizer.position === this.tokenizer.fileInfo.size;
      const scanData = data.subarray(0, retained + read);
      const scanEnd = atEnd ? scanData.length : Math.max(0, scanData.length - overlap);

      // Use the native byte search, then validate each sync candidate as before.
      for (let i = scanData.indexOf(0xff); i >= 0 && i < scanEnd; i = scanData.indexOf(0xff, i + 1)) {
        try {
          const header = Flac.parseFlacFrameHeader(scanData, i);
          if (
            !Flac.validateFlacFrameCrc8(
              scanData.subarray(i, i + header.headerBytes),
              header.crc8Position - i,
              header.storedCrc8
            )
          ) {
            continue;
          }
          // The blocking strategy cannot change within a FLAC stream, and
          // coded numbers must increase. Ignore out-of-order sync candidates.
          if (
            frameCount > 0 &&
            (header.blockingStrategy !== blockingStrategy ||
              header.number <= (blockingStrategy ? lastCodedSampleNumber : lastFrameNumber))
          ) {
            continue;
          }
          // Valid frame header
          ++frameCount;
          blockingStrategy = header.blockingStrategy;
          if (header.blockingStrategy) {
            lastCodedSampleNumber = header.number;
          } else {
            lastFrameNumber = header.number;
            nominalBlockSize ??= header.blockSize;
          }
          frameBlockSize = header.blockSize;
        } catch {
          // Not a valid frame header at this position; keep scanning.
        }
      }
      if (atEnd) {
        break;
      }
      retained = scanData.length - scanEnd;
      data.copyWithin(0, scanEnd, scanData.length);
    }

    let totalSamples: number | undefined;
    if (!blockingStrategy && lastFrameNumber >= 0 && nominalBlockSize && frameBlockSize) {
      // Fixed-blocksize: all preceding frames use the nominal size, but the
      // final frame can be short and carries its actual sample count.
      totalSamples = lastFrameNumber * nominalBlockSize + frameBlockSize;
    } else if (blockingStrategy && lastCodedSampleNumber >= 0 && frameBlockSize) {
      // Variable-blocksize: coded number is the first sample of the last frame.
      totalSamples = lastCodedSampleNumber + frameBlockSize;
    }

    if (totalSamples && totalSamples > 0) {
      debug(`FLAC frame scan: ${frameCount} frames, ${totalSamples} samples`);
      this.metadata.setFormat('numberOfSamples', totalSamples);
      this.metadata.setFormat('duration', totalSamples / sampleRate);
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
    if (dataLen !== Flac.BlockStreamInfo.len) {
      throw new FlacContentError('Unexpected block-stream-info length');
    }

    const streamInfo = await this.readToken(Flac.BlockStreamInfo);
    if (this.metadataBuffer) {
      // STREAMINFO survives subsequent refills of the shared metadata buffer.
      streamInfo.fileMD5 = new Uint8Array(streamInfo.fileMD5);
    }
    this.streamInfo = streamInfo;
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
    const data = await this.readToken(new Uint8ArrayType(dataLen));
    return this.parseComment(data);
  }

  /**
   * Parse VORBIS_COMMENT
   * Ref: https://www.xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-640004.2.3
   */
  public async parseComment(data: Uint8Array): Promise<void> {
    const decoder = new VorbisDecoder(data, 0);
    const { vendor, comments } = decoder.parseCommentList(
      message => new FlacContentError(message),
      getMaxMetadataEntries(this.options)
    );
    if (vendor.length > 0) {
      this.metadata.setFormat('tool', vendor);
    }
    for (const tag of comments) {
      if (tag.key === 'ENCODER') {
        this.metadata.setFormat('tool', tag.value);
      }
      await this.addTag(tag.key, tag.value);
    }
  }

  private async parsePicture(dataLen: number) {
    if (this.options.skipCovers) {
      return this.tokenizer.ignore(dataLen);
    }
    return this.addPictureTag(
      await this.readToken(new VorbisPictureToken(dataLen, { createError: message => new FlacContentError(message) }))
    );
  }

  public addPictureTag(picture: IVorbisPicture): Promise<void> {
    return this.addTag('METADATA_BLOCK_PICTURE', picture);
  }

  private addTag(id: string, value: string | IVorbisPicture): Promise<void> {
    return this.vorbisParser.addTag(id, value);
  }
}
