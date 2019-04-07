import * as assert from 'assert';
import * as Token from 'token-types';
import * as initDebug from 'debug';
import { FourCcToken } from '../common/FourCC';
import { BasicParser } from '../common/BasicParser';

import {ChunkHeader, IChunkHeader} from "./DsdiffToken";

const debug = initDebug('music-metadata:parser:aiff');

/**
 * DSDIFF - Direct Stream Digital Interchange File Format (Phillips)
 *
 * Ref:
 *  http://www.sonicstudio.com/pdf/dsd/DSDIFF_1.5_Spec.pdf
 */
export class DsdiffParser extends BasicParser {

  public async parse(): Promise<void> {

    const header = await this.tokenizer.readToken<IChunkHeader>(ChunkHeader);
    assert.strictEqual(header.chunkID, 'FRM8');

    const type = (await this.tokenizer.readToken<string>(FourCcToken)).trim();
    switch (type) {

      case 'DSD':
        this.metadata.setFormat('dataformat', `DSDIFF/${type}`);
        this.metadata.setFormat('lossless', true);
        return this.readFmt8Chunks(header.chunkSize - FourCcToken.len);

      default:
        throw Error(`Unsupported DSDIFF type: ${type}`);
    }
  }

  private async readFmt8Chunks(remainingSize: number): Promise<void> {

    while (remainingSize >= ChunkHeader.len) {
      const chunkHeader = await this.tokenizer.readToken<IChunkHeader>(ChunkHeader);

      //  If the data is an odd number of bytes in length, a pad byte must be added at the end
      debug(`Chunk id=${chunkHeader.chunkID}`);
      await this.readData(chunkHeader);
      remainingSize -= (ChunkHeader.len + chunkHeader.chunkSize);
    }
  }

  private async readData(header: IChunkHeader): Promise<void> {
    debug(`Reading data of chunk[ID=${header.chunkID}, size=${header.chunkSize}]`);
    const p0 = this.tokenizer.position;
    switch (header.chunkID.trim()) {

      case 'FVER': // 3.1 FORMAT VERSION CHUNK
        const version = await this.tokenizer.readToken<number>(Token.UINT32_LE);
        debug(`DSDIFF version=${version}`);
        break;

      case 'PROP': // 3.2 PROPERTY CHUNK
        const propType = await this.tokenizer.readToken(FourCcToken);
        assert.strictEqual(propType, 'SND ');
        await this.handleSoundPropertyChunks(header.chunkSize - FourCcToken.len);
        break;

      default:
        debug(`Ignore chunk[ID=${header.chunkID}, size=${header.chunkSize}]`);
        break;

      case 'DSD':
        const duration = header.chunkSize * 8 / (this.metadata.format.numberOfChannels * this.metadata.format.sampleRate); // ToDO: not sure if this is correct
        this.metadata.setFormat('duration', duration);
        break;

    }
    const remaining = header.chunkSize - (this.tokenizer.position - p0);
    if (remaining > 0) {
      debug(`After Parsing chunk, remaining ${remaining} bytes`);
      await this.tokenizer.ignore(remaining);
    }
  }

  private async handleSoundPropertyChunks(remainingSize: number): Promise<void> {
    debug(`Parsing sound-property-chunks, remainingSize=${remainingSize}`);
    while (remainingSize > 0) {
      const sndPropHeader = await this.tokenizer.readToken<IChunkHeader>(ChunkHeader);
      debug(`Sound-property-chunk[ID=${sndPropHeader.chunkID}, size=${sndPropHeader.chunkSize}]`);
      const p0 = this.tokenizer.position;
      switch (sndPropHeader.chunkID.trim()) {

        case 'FS': // 3.2.1 Sample Rate Chunk
          const sampleRate = await this.tokenizer.readToken<number>(Token.UINT32_BE);
          this.metadata.setFormat('sampleRate', sampleRate);
          break;

        case 'CHNL': // 3.2.2 Channels Chunk
          const numChannels = await this.tokenizer.readToken<number>(Token.UINT16_BE);
          this.metadata.setFormat('numberOfChannels', numChannels);
          await this.handleChannelChunks(sndPropHeader.chunkSize - Token.UINT16_BE.len);
          break;

        case 'CMPR': // 3.2.3 Compression Type Chunk
          const compressionIdCode = (await this.tokenizer.readToken<string>(FourCcToken)).trim();
          const count = await this.tokenizer.readToken<number>(Token.UINT8);
          const compressionName = await this.tokenizer.readToken<string>(new Token.StringType(count, 'ascii'));
          if (compressionIdCode === 'DSD') {
            this.metadata.setFormat('lossless', true);
            this.metadata.setFormat('bitsPerSample', 1);
          }
          this.metadata.setFormat('encoder', `${compressionIdCode} (${compressionName})`);
          break;

        case 'ABSS': // 3.2.4 Absolute Start Time Chunk
          const hours = await this.tokenizer.readToken<number>(Token.UINT16_BE);
          const minutes = await this.tokenizer.readToken<number>(Token.UINT8);
          const seconds = await this.tokenizer.readToken<number>(Token.UINT8);
          const samples = await this.tokenizer.readToken<number>(Token.UINT32_BE);
          debug(`ABSS ${hours}:${minutes}:${seconds}.${samples}`);
          break;

        case 'LSCO': // 3.2.5 Loudspeaker Configuration Chunk
          const lsConfig = await this.tokenizer.readToken<number>(Token.UINT16_BE);
          debug(`LSCO lsConfig=${lsConfig}`);
          break;

        case 'COMT':
        default:
          debug(`Unknown sound-property-chunk[ID=${sndPropHeader.chunkID}, size=${sndPropHeader.chunkSize}]`);
          await this.tokenizer.ignore(sndPropHeader.chunkSize);
      }
      const remaining = sndPropHeader.chunkSize - (this.tokenizer.position - p0);
      if (remaining > 0) {
        debug(`After Parsing sound-property-chunk ${sndPropHeader.chunkSize}, remaining ${remaining} bytes`);
        await this.tokenizer.ignore(remaining);
      }
      remainingSize -= ChunkHeader.len + sndPropHeader.chunkSize;
      debug(`Parsing sound-property-chunks, remainingSize=${remainingSize}`);
    }
  }

  private async handleChannelChunks(remainingSize: number): Promise<string[]> {
    debug(`Parsing channel-chunks, remainingSize=${remainingSize}`);
    const channels: string[] = [];
    while (remainingSize >= FourCcToken.len) {
      const channelId = await this.tokenizer.readToken<string>(FourCcToken);
      debug(`Channel[ID=${channelId}]`);
      channels.push(channelId);
      remainingSize -= FourCcToken.len;
    }
    debug(`Channels: ${channels.join(', ')}`);
    return channels;
  }
}
