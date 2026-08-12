import initDebug from 'debug';

import { AbstractID3Parser } from '../id3v2/AbstractID3Parser.js';
import {
  ChunkHeader,
  DsdChunk,
  FormatChunk,
  type IChunkHeader,
  type IDsdChunk,
  type IFormatChunk
} from './DsfChunk.js';
import { ID3v2Parser } from '../id3v2/ID3v2Parser.js';
import { makeUnexpectedFileContentError } from '../ParseError.js';
import { ID3v2Header } from '../id3v2/ID3v2Token.js';

const debug = initDebug('music-metadata:parser:DSF');

export class DsdContentParseError extends makeUnexpectedFileContentError('DSD') {
}

/**
 * DSF (dsd stream file) File Parser
 * Ref: https://dsd-guide.com/sites/default/files/white-papers/DSFFileFormatSpec_E.pdf
 */
export class DsfParser extends AbstractID3Parser {

  public async postId3v2Parse(): Promise<void> {

    const p0 = this.tokenizer.position; // mark start position, normally 0
    const chunkHeader = await this.tokenizer.readToken<IChunkHeader>(ChunkHeader);

    if (chunkHeader.id !== 'DSD ') {
      throw new DsdContentParseError('Invalid chunk signature');
    }

    if (chunkHeader.size !== BigInt(ChunkHeader.len + DsdChunk.len)) {
      throw new DsdContentParseError(`Invalid DSD chunk size: ${chunkHeader.size}`);
    }

    this.metadata.setFormat('container', 'DSF');
    this.metadata.setFormat('lossless', true);
    this.metadata.setAudioOnly();

    const dsdChunk = await this.tokenizer.readToken<IDsdChunk>(DsdChunk);

    if (dsdChunk.fileSize < chunkHeader.size) {
      throw new DsdContentParseError(`Invalid DSF file size: ${dsdChunk.fileSize}`);
    }

    await this.parseChunks(dsdChunk.fileSize - chunkHeader.size);

    if (dsdChunk.metadataPointer === 0n) {
      debug('No ID3v2 tag present');
      return;
    }

    debug(`expect ID3v2 at offset=${dsdChunk.metadataPointer}`);

    const metadataOffset =
      dsdChunk.metadataPointer - BigInt(this.tokenizer.position - p0);

    if (
      metadataOffset < 0n ||
      metadataOffset > BigInt(Number.MAX_SAFE_INTEGER) ||
      dsdChunk.metadataPointer + BigInt(ID3v2Header.len) > dsdChunk.fileSize
    ) {
      throw new DsdContentParseError(`Invalid metadata pointer: ${dsdChunk.metadataPointer}`);
    }

    await this.tokenizer.ignore(Number(metadataOffset));

    return new ID3v2Parser().parse(
      this.metadata,
      this.tokenizer,
      this.options
    );
  }

  private async parseChunks(bytesRemaining: bigint): Promise<void> {

    const chunkHeaderSize = BigInt(ChunkHeader.len);

    while (bytesRemaining >= chunkHeaderSize) {
      const chunkHeader = await this.tokenizer.readToken<IChunkHeader>(ChunkHeader);

      debug(`Parsing chunk name=${chunkHeader.id} size=${chunkHeader.size}`);

      if (chunkHeader.size < chunkHeaderSize) {
        throw new DsdContentParseError(
          `Invalid ${chunkHeader.id} chunk size: ${chunkHeader.size}`
        );
      }

      if (chunkHeader.size > bytesRemaining) {
        throw new DsdContentParseError(
          `${chunkHeader.id} chunk exceeds remaining file size`
        );
      }

      const payloadSize = chunkHeader.size - chunkHeaderSize;

      switch (chunkHeader.id) {

        case 'fmt ': {
          if (payloadSize < BigInt(FormatChunk.len)) {
            throw new DsdContentParseError(
              `Invalid fmt chunk size: ${chunkHeader.size}`
            );
          }

          const formatChunk = await this.tokenizer.readToken<IFormatChunk>(FormatChunk);

          this.metadata.setFormat('numberOfChannels', formatChunk.channelNum);
          this.metadata.setFormat('sampleRate', formatChunk.samplingFrequency);
          this.metadata.setFormat('bitsPerSample', formatChunk.bitsPerSample);
          this.metadata.setFormat('numberOfSamples', formatChunk.sampleCount);
          this.metadata.setFormat(
            'duration',
            Number(formatChunk.sampleCount) / formatChunk.samplingFrequency
          );

          const bitrate =
            formatChunk.bitsPerSample *
            formatChunk.samplingFrequency *
            formatChunk.channelNum;

          this.metadata.setFormat('bitrate', bitrate);

          return; // We got what we want, stop further processing of chunks
        }

        default:
          await this.tokenizer.ignore(Number(payloadSize));
          break;
      }

      bytesRemaining -= chunkHeader.size;
    }
  }
}
