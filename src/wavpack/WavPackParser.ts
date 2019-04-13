import * as Token from 'token-types';
import * as assert from 'assert';

import { APEv2Parser } from '../apev2/APEv2Parser';
import { FourCcToken } from '../common/FourCC';
import { BasicParser } from '../common/BasicParser';
import { IMetadataId, WavPack } from './WavPackToken';

import * as initDebug from 'debug';

const debug = initDebug('music-metadata:parser:WavPack');

/**
 * WavPack Parser
 */
export class WavPackParser extends BasicParser {

  public async parse(): Promise<void> {

    // First parse all WavPack blocks
    await this.parseWavPackBlocks();
    // try to parse APEv2 header
    return APEv2Parser.parseTagHeader(this.metadata, this.tokenizer, this.options);
  }

  public async parseWavPackBlocks(): Promise<void> {

    do {
      const blockId = await this.tokenizer.peekToken<string>(FourCcToken);
      if (blockId !== 'wvpk')
        break;

      const header = await this.tokenizer.readToken(WavPack.BlockHeaderToken);
      assert.strictEqual(header.BlockID, 'wvpk', 'WavPack Block-ID');

      debug(`WavPack header blockIndex=${header.blockIndex}, len=${WavPack.BlockHeaderToken.len}`);

      if (header.blockIndex === 0 && !this.metadata.format.dataformat) {
        this.metadata.setFormat('dataformat', 'WavPack');
        this.metadata.setFormat('lossless', !header.flags.isHybrid);
        // tagTypes: this.type,
        this.metadata.setFormat('bitsPerSample', header.flags.bitsPerSample);
        this.metadata.setFormat('sampleRate', header.flags.samplingRate);
        this.metadata.setFormat('numberOfChannels', header.flags.isMono ? 1 : 2);
        this.metadata.setFormat('numberOfSamples', header.totalSamples);
        this.metadata.setFormat('duration', header.totalSamples / header.flags.samplingRate);
        this.metadata.setFormat('codecProfile', header.flags.isDSD ? 'DSD' : 'PCM');
      }

      const ignoreBytes = header.blockSize - (WavPack.BlockHeaderToken.len - 8);

      if (header.blockIndex === 0 && header.blockSamples === 0) {
        // Meta-data block
        await this.parseMetadataSubBlock(ignoreBytes);
      } else {
        await this.tokenizer.ignore(ignoreBytes);
      }
    }
    while (!this.tokenizer.fileSize || this.tokenizer.fileSize - this.tokenizer.position >= WavPack.BlockHeaderToken.len);
  }

  /**
   * Ref: ttp://www.wavpack.com/WavPack5FileFormat.pdf, 3.0 Metadata Sub-blocks
   * @param remainingLength
   */
  private async parseMetadataSubBlock(remainingLength: number): Promise<void> {
    do {
      const id = await this.tokenizer.readToken<IMetadataId>(WavPack.MetadataIdToken);
      const dataSizeInWords = await this.tokenizer.readNumber(id.largeBlock ? Token.UINT24_LE : Token.UINT8);
      const metadataSize = 1 + dataSizeInWords * 2 + (id.largeBlock ? Token.UINT24_LE.len : Token.UINT8.len);
      if (metadataSize > remainingLength)
        throw new Error('Metadata exceeding block size');
      const data = Buffer.alloc(dataSizeInWords * 2);
      await this.tokenizer.readBuffer(data, 0, data.length);
      switch (id.functionId) {
        case 0x0: // ID_DUMMY could be used to pad WavPack blocks
          break;

        case 0x24: // ID_ALT_TRAILER
          debug('ID_ALT_TRAILER: trailer for non-wav files');
          break;

        case 0x26: // ID_MD5_CHECKSUM
          this.metadata.setFormat('audioMD5', data);
          break;

        case 0x2F: // ID_BLOCK_CHECKSUM
          break;

        default:
          debug(`Ignore unsupported meta-sub-block-id functionId=0x${id.functionId.toString(16)}`);
          break;
      }

      remainingLength -= metadataSize;
    } while (remainingLength > 1);
  }

}
