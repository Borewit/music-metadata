import initDebug from 'debug';
import * as strtok3 from 'strtok3';
import * as Token from 'token-types';
import { getMaxMetadataEntries } from '../common/Allocation.js';
import { BasicParser } from '../common/BasicParser.js';
import { FourCcToken } from '../common/FourCC.js';
import { parseEmbeddedID3v2 } from '../id3v2/EmbeddedID3v2.js';
import * as iff from '../iff/index.js';
import * as AiffToken from './AiffToken.js';
import { AiffContentError, type CompressionTypeCode, compressionTypes } from './AiffToken.js';

const debug = initDebug('music-metadata:parser:aiff');

/**
 * AIFF - Audio Interchange File Format
 *
 * Ref:
 * - http://www-mmsp.ece.mcgill.ca/Documents/AudioFormats/AIFF/AIFF.html
 * - http://www-mmsp.ece.mcgill.ca/Documents/AudioFormats/AIFF/Docs/AIFF-1.3.pdf
 */
export class AIFFParser extends BasicParser {
  private isCompressed: boolean | null = null;
  private soundDataBytes: number | undefined;
  private soundDataComplete = false;
  private common: AiffToken.ICommon | undefined;

  public async parse(): Promise<void> {
    const header = await this.readToken<iff.IChunkHeader>(iff.Header);
    if (header.chunkID !== 'FORM') {
      throw new AiffContentError("Invalid Chunk-ID, expected 'FORM'"); // Not AIFF format
    }

    const type = await this.readToken<string>(FourCcToken);
    switch (type) {
      case 'AIFF':
        this.metadata.setFormat('container', type);
        this.isCompressed = false;
        break;

      case 'AIFC':
        this.metadata.setFormat('container', 'AIFF-C');
        this.isCompressed = true;
        break;

      default:
        throw new AiffContentError(`Unsupported AIFF type: ${type}`);
    }
    this.metadata.setFormat('lossless', !this.isCompressed);
    this.metadata.setAudioOnly();

    let remaining = header.chunkSize - FourCcToken.len;
    if (remaining < 0) {
      throw new AiffContentError(`Invalid FORM chunk size: ${header.chunkSize}`);
    }
    try {
      while (remaining >= iff.Header.len) {
        debug(`Reading AIFF chunk at offset=${this.tokenizer.position}`);
        const chunkHeader = await this.readToken<iff.IChunkHeader>(iff.Header);
        remaining -= iff.Header.len;
        const available = this.tokenizer.fileInfo.size;
        if (
          chunkHeader.chunkSize > remaining ||
          (available !== undefined && chunkHeader.chunkSize > available - this.tokenizer.position)
        ) {
          throw new AiffContentError(
            `Chunk ${chunkHeader.chunkID} size ${chunkHeader.chunkSize} exceeds remaining FORM data`
          );
        }

        const nextChunk = 2 * Math.round(chunkHeader.chunkSize / 2);
        const bytesRead = await this.readData(chunkHeader);
        const ignored = await this.tokenizer.ignore(nextChunk - bytesRead);
        if (chunkHeader.chunkID === 'SSND') {
          this.soundDataComplete = ignored === nextChunk - bytesRead;
        }
        remaining -= nextChunk;
      }
    } catch (err) {
      if (err instanceof strtok3.EndOfStreamError) {
        debug('End-of-stream');
      } else {
        throw err;
      }
    }

    // Apple IMA4 COMM stores packet counts; some encoders already store decoded
    // frames. Only expand counts corroborated by the complete SSND payload.
    // Each packet contains 64 frames in 34 bytes per channel.
    const common = this.common;
    if (
      common?.compressionType === 'ima4' &&
      common.numChannels > 0 &&
      common.numSampleFrames > 0 &&
      common.sampleRate > 0 &&
      this.soundDataComplete &&
      this.soundDataBytes === common.numSampleFrames * common.numChannels * 34
    ) {
      const samples = common.numSampleFrames * 64;
      this.metadata.setFormat('numberOfSamples', samples);
      this.metadata.setFormat('duration', samples / common.sampleRate);
    }

    // COMM and SSND can appear in either order.
    const duration = this.metadata.format.duration;
    if (this.soundDataBytes !== undefined && duration !== undefined && Number.isFinite(duration) && duration > 0) {
      this.metadata.setFormat('bitrate', (8 * this.soundDataBytes) / duration);
    }
  }

  public async readData(header: iff.IChunkHeader): Promise<number> {
    switch (header.chunkID) {
      case 'COMM': {
        // The Common Chunk
        if (this.isCompressed === null) {
          throw new AiffContentError('Failed to parse AIFF.COMM chunk when compression type is unknown');
        }
        const common = await this.readToken<AiffToken.ICommon>(new AiffToken.Common(header, this.isCompressed));
        this.common = common;
        this.metadata.setFormat('bitsPerSample', common.sampleSize);
        this.metadata.setFormat('sampleRate', common.sampleRate);
        this.metadata.setFormat('numberOfChannels', common.numChannels);
        this.metadata.setFormat('numberOfSamples', common.numSampleFrames);
        this.metadata.setFormat('duration', common.numSampleFrames / common.sampleRate);
        if (common.compressionName || common.compressionType) {
          this.metadata.setFormat(
            'codec',
            common.compressionName ?? compressionTypes[common.compressionType as CompressionTypeCode]
          );
        }
        return header.chunkSize;
      }

      case 'ID3 ': {
        // ID3-meta-data
        await parseEmbeddedID3v2(this.metadata, this.tokenizer, this.options, header.chunkSize);
        return header.chunkSize;
      }

      case 'SSND': {
        this.soundDataComplete = false;
        if (header.chunkSize < AiffToken.SoundDataHeader.len) {
          throw new AiffContentError('SSND chunk is too small to contain its header');
        }
        const sound = await this.readToken(AiffToken.SoundDataHeader);
        const payloadSize = header.chunkSize - AiffToken.SoundDataHeader.len;
        if (sound.offset > payloadSize) {
          throw new AiffContentError('SSND alignment offset exceeds its payload size');
        }
        this.soundDataBytes = payloadSize - sound.offset;
        return AiffToken.SoundDataHeader.len;
      }

      case 'NAME': // Sample name chunk
      case 'AUTH': // Author chunk
      case '(c) ': // Copyright chunk
      case 'ANNO': // Annotation chunk
        return this.readTextChunk(header);

      default:
        debug(`Ignore chunk id=${header.chunkID}, size=${header.chunkSize}`);
        return 0;
    }
  }

  public async readTextChunk(header: iff.IChunkHeader): Promise<number> {
    const value = await this.readToken(new Token.StringType(header.chunkSize, 'ascii'));
    let valueCount = 1;
    for (let offset = value.indexOf('\0'); offset >= 0; offset = value.indexOf('\0', offset + 1)) {
      ++valueCount;
    }
    if (valueCount > getMaxMetadataEntries(this.options)) {
      throw new AiffContentError(
        `Text value count ${valueCount} exceeds entry limit ${getMaxMetadataEntries(this.options)}`
      );
    }
    const values = value
      .split('\0')
      .map(v => v.trim())
      .filter(v => v?.length);
    await Promise.all(values.map(v => this.metadata.addTag('AIFF', header.chunkID, v)));
    return header.chunkSize;
  }
}
