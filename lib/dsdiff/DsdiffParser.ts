import initDebug from 'debug';
import * as strtok3 from 'strtok3';
import * as Token from 'token-types';
import { getTokenizerOptions } from '../common/Allocation.js';
import { BasicParser } from '../common/BasicParser.js';
import { FourCcToken } from '../common/FourCC.js';
import { ID3v2Parser } from '../id3v2/ID3v2Parser.js';
import { makeUnexpectedFileContentError } from '../ParseError.js';
import { ChunkHeader64, type IChunkHeader64 } from './DsdiffToken.js';

const debug = initDebug('music-metadata:parser:dsdiff');

export class DsdiffContentParseError extends makeUnexpectedFileContentError('DSDIFF') {}

/**
 * DSDIFF - Direct Stream Digital Interchange File Format (Phillips)
 *
 * Ref:
 * - http://www.sonicstudio.com/pdf/dsd/DSDIFF_1.5_Spec.pdf
 */
export class DsdiffParser extends BasicParser {
  public async parse(): Promise<void> {
    const header = await this.readToken<IChunkHeader64>(ChunkHeader64);
    if (header.chunkID !== 'FRM8') {
      throw new DsdiffContentParseError('Unexpected chunk-ID');
    }

    this.validateChunkSize(header);
    this.requireChunkSize(header, FourCcToken.len);
    this.metadata.setAudioOnly();

    const type = (await this.readToken<string>(FourCcToken)).trim();
    switch (type) {
      case 'DSD':
        this.metadata.setFormat('container', `DSDIFF/${type}`);
        this.metadata.setFormat('lossless', true);
        return this.readFmt8Chunks(header.chunkSize - BigInt(FourCcToken.len));

      default:
        throw new DsdiffContentParseError(`Unsupported DSDIFF type: ${type}`);
    }
  }

  private validateChunkSize(header: IChunkHeader64, remainingSize?: bigint): void {
    const size = header.chunkSize;
    if (size < 0n || size > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new DsdiffContentParseError(`Invalid chunk size: ${size}`);
    }
    const paddedSize = size + (size & 1n);
    if (remainingSize !== undefined && paddedSize > remainingSize) {
      throw new DsdiffContentParseError(`Chunk ${header.chunkID} size ${size} exceeds its enclosing chunk`);
    }
    const fileSize = this.tokenizer.fileInfo.size;
    if (fileSize !== undefined && paddedSize > BigInt(fileSize - this.tokenizer.position)) {
      throw new DsdiffContentParseError(`Chunk ${header.chunkID} size ${size} exceeds remaining file size`);
    }
  }

  private requireChunkSize(header: IChunkHeader64, minimum: number): void {
    if (header.chunkSize < BigInt(minimum)) {
      throw new DsdiffContentParseError(`Chunk ${header.chunkID} is too small: ${header.chunkSize}`);
    }
  }

  private async ignoreBytes(length: bigint): Promise<void> {
    if ((await this.tokenizer.ignore(Number(length))) !== Number(length)) {
      throw new DsdiffContentParseError('Unexpected end of chunk');
    }
  }

  private async readFmt8Chunks(remainingSize: bigint): Promise<void> {
    while (remainingSize >= ChunkHeader64.len) {
      const chunkHeader = await this.readToken<IChunkHeader64>(ChunkHeader64);
      this.validateChunkSize(chunkHeader, remainingSize - BigInt(ChunkHeader64.len));

      //  If the data is an odd number of bytes in length, a pad byte must be added at the end
      debug(`Chunk id=${chunkHeader.chunkID}`);
      await this.readData(chunkHeader);
      const padding = chunkHeader.chunkSize & 1n;
      await this.ignoreBytes(padding);
      remainingSize -= BigInt(ChunkHeader64.len) + chunkHeader.chunkSize + padding;
    }
  }

  private async readData(header: IChunkHeader64): Promise<void> {
    debug(`Reading data of chunk[ID=${header.chunkID}, size=${header.chunkSize}]`);
    const p0 = this.tokenizer.position;
    switch (header.chunkID.trim()) {
      case 'FVER': {
        this.requireChunkSize(header, Token.UINT32_LE.len);
        // 3.1 FORMAT VERSION CHUNK
        const version = await this.readToken<number>(Token.UINT32_LE);
        debug(`DSDIFF version=${version}`);
        break;
      }

      case 'PROP': {
        this.requireChunkSize(header, FourCcToken.len);
        // 3.2 PROPERTY CHUNK
        const propType = await this.readToken(FourCcToken);
        if (propType !== 'SND ') {
          throw new DsdiffContentParseError('Unexpected PROP-chunk ID');
        }
        await this.handleSoundPropertyChunks(header.chunkSize - BigInt(FourCcToken.len));
        break;
      }

      case 'ID3': {
        // Unofficial ID3 tag support
        const id3_data = await this.readToken<Uint8Array>(new Token.Uint8ArrayType(Number(header.chunkSize)));
        const rst = strtok3.fromBuffer(id3_data, getTokenizerOptions(this.options));
        await new ID3v2Parser().parse(this.metadata, rst, this.options);
        break;
      }

      case 'DSD':
        if (this.metadata.format.numberOfChannels) {
          this.metadata.setFormat(
            'numberOfSamples',
            Number((header.chunkSize * BigInt(8)) / BigInt(this.metadata.format.numberOfChannels))
          );
        }
        if (this.metadata.format.numberOfSamples && this.metadata.format.sampleRate) {
          this.metadata.setFormat('duration', this.metadata.format.numberOfSamples / this.metadata.format.sampleRate);
        }
        break;

      default:
        debug(`Ignore chunk[ID=${header.chunkID}, size=${header.chunkSize}]`);
        break;
    }
    const remaining = header.chunkSize - BigInt(this.tokenizer.position - p0);
    if (remaining > 0) {
      debug(`After Parsing chunk, remaining ${remaining} bytes`);
      await this.ignoreBytes(remaining);
    }
  }

  private async handleSoundPropertyChunks(remainingSize: bigint): Promise<void> {
    debug(`Parsing sound-property-chunks, remainingSize=${remainingSize}`);
    while (remainingSize >= BigInt(ChunkHeader64.len)) {
      const sndPropHeader = await this.readToken<IChunkHeader64>(ChunkHeader64);
      this.validateChunkSize(sndPropHeader, remainingSize - BigInt(ChunkHeader64.len));
      debug(`Sound-property-chunk[ID=${sndPropHeader.chunkID}, size=${sndPropHeader.chunkSize}]`);
      const p0 = this.tokenizer.position;
      switch (sndPropHeader.chunkID.trim()) {
        case 'FS': {
          this.requireChunkSize(sndPropHeader, Token.UINT32_BE.len);
          // 3.2.1 Sample Rate Chunk
          const sampleRate = await this.readToken<number>(Token.UINT32_BE);
          this.metadata.setFormat('sampleRate', sampleRate);
          break;
        }

        case 'CHNL': {
          this.requireChunkSize(sndPropHeader, Token.UINT16_BE.len);
          // 3.2.2 Channels Chunk
          const numChannels = await this.readToken<number>(Token.UINT16_BE);
          this.metadata.setFormat('numberOfChannels', numChannels);
          await this.handleChannelChunks(sndPropHeader.chunkSize - BigInt(Token.UINT16_BE.len));
          break;
        }

        case 'CMPR': {
          this.requireChunkSize(sndPropHeader, FourCcToken.len + Token.UINT8.len);
          // 3.2.3 Compression Type Chunk
          const compressionIdCode = (await this.readToken<string>(FourCcToken)).trim();
          const count = await this.readToken<number>(Token.UINT8);
          this.requireChunkSize(sndPropHeader, FourCcToken.len + Token.UINT8.len + count);
          const compressionName = await this.readToken<string>(new Token.StringType(count, 'ascii'));
          if (compressionIdCode === 'DSD') {
            this.metadata.setFormat('lossless', true);
            this.metadata.setFormat('bitsPerSample', 1);
          }
          this.metadata.setFormat('codec', `${compressionIdCode} (${compressionName})`);
          break;
        }

        case 'ABSS': {
          this.requireChunkSize(sndPropHeader, 8);
          // 3.2.4 Absolute Start Time Chunk
          const hours = await this.readToken<number>(Token.UINT16_BE);
          const minutes = await this.readToken<number>(Token.UINT8);
          const seconds = await this.readToken<number>(Token.UINT8);
          const samples = await this.readToken<number>(Token.UINT32_BE);
          debug(`ABSS ${hours}:${minutes}:${seconds}.${samples}`);
          break;
        }

        case 'LSCO': {
          this.requireChunkSize(sndPropHeader, Token.UINT16_BE.len);
          // 3.2.5 Loudspeaker Configuration Chunk
          const lsConfig = await this.readToken<number>(Token.UINT16_BE);
          debug(`LSCO lsConfig=${lsConfig}`);
          break;
        }
        default:
          debug(`Unknown sound-property-chunk[ID=${sndPropHeader.chunkID}, size=${sndPropHeader.chunkSize}]`);
          await this.ignoreBytes(sndPropHeader.chunkSize);
      }
      const remaining = sndPropHeader.chunkSize - BigInt(this.tokenizer.position - p0);
      if (remaining > 0) {
        debug(`After Parsing sound-property-chunk ${sndPropHeader.chunkSize}, remaining ${remaining} bytes`);
        await this.ignoreBytes(remaining);
      }
      const padding = sndPropHeader.chunkSize & 1n;
      await this.ignoreBytes(padding);
      remainingSize -= BigInt(ChunkHeader64.len) + sndPropHeader.chunkSize + padding;
      debug(`Parsing sound-property-chunks, remainingSize=${remainingSize}`);
    }
    if (remainingSize !== 0n) {
      throw new DsdiffContentParseError('Incomplete sound-property chunk header');
    }
    if (
      this.metadata.format.lossless &&
      this.metadata.format.sampleRate &&
      this.metadata.format.numberOfChannels &&
      this.metadata.format.bitsPerSample
    ) {
      const bitrate =
        this.metadata.format.sampleRate * this.metadata.format.numberOfChannels * this.metadata.format.bitsPerSample;
      this.metadata.setFormat('bitrate', bitrate);
    }
  }

  private async handleChannelChunks(remainingSize: bigint): Promise<void> {
    debug(`Parsing channel-chunks, remainingSize=${remainingSize}`);
    while (remainingSize >= FourCcToken.len) {
      const channelId = await this.readToken<string>(FourCcToken);
      debug(`Channel[ID=${channelId}]`);
      remainingSize -= BigInt(FourCcToken.len);
    }
  }
}
