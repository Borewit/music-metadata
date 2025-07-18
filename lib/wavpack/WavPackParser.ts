import * as Token from 'token-types';

import { tryParseApeHeader } from '../apev2/APEv2Parser.js';
import { FourCcToken } from '../common/FourCC.js';
import { BasicParser } from '../common/BasicParser.js';
import { BlockHeaderToken, type IBlockHeader, type IMetadataId, MetadataIdToken } from './WavPackToken.js';

import initDebug from 'debug';
import { uint8ArrayToHex } from 'uint8array-extras';
import { makeUnexpectedFileContentError } from '../ParseError.js';

const debug = initDebug('music-metadata:parser:WavPack');

export class WavPackContentError extends makeUnexpectedFileContentError('WavPack'){
}

/**
 * WavPack Parser
 */
export class WavPackParser extends BasicParser {

  private audioDataSize = 0;

  public async parse(): Promise<void> {

    this.metadata.setAudioOnly();

    this.audioDataSize = 0;

    // First parse all WavPack blocks
    await this.parseWavPackBlocks();
    // try to parse APEv2 header

    return tryParseApeHeader(this.metadata, this.tokenizer, this.options);
  }

  public async parseWavPackBlocks(): Promise<void> {

    do {
      const blockId = await this.tokenizer.peekToken<string>(FourCcToken);
      if (blockId !== 'wvpk')
        break;

      const header = await this.tokenizer.readToken<IBlockHeader>(BlockHeaderToken);
      if (header.BlockID !== 'wvpk') throw new WavPackContentError('Invalid WavPack Block-ID');

      debug(`WavPack header blockIndex=${header.blockIndex}, len=${BlockHeaderToken.len}`);

      if (header.blockIndex === 0 && !this.metadata.format.container) {
        this.metadata.setFormat('container', 'WavPack');
        this.metadata.setFormat('lossless', !header.flags.isHybrid);
        // tagTypes: this.type,
        this.metadata.setFormat('bitsPerSample', header.flags.bitsPerSample);
        if (!header.flags.isDSD) {
          // In case isDSD, these values will ne set in ID_DSD_BLOCK
          this.metadata.setFormat('sampleRate', header.flags.samplingRate);
          this.metadata.setFormat('duration', header.totalSamples / header.flags.samplingRate);
        }
        this.metadata.setFormat('numberOfChannels', header.flags.isMono ? 1 : 2);
        this.metadata.setFormat('numberOfSamples', header.totalSamples);
        this.metadata.setFormat('codec', header.flags.isDSD ? 'DSD' : 'PCM');
      }

      const ignoreBytes = header.blockSize - (BlockHeaderToken.len - 8);

      await (header.blockIndex === 0 ? this.parseMetadataSubBlock(header, ignoreBytes) : this.tokenizer.ignore(ignoreBytes));
      if (header.blockSamples > 0) {
        this.audioDataSize += header.blockSize; // Count audio data for bit-rate calculation
      }
    }
    while (!this.tokenizer.fileInfo.size || this.tokenizer.fileInfo.size - this.tokenizer.position >= BlockHeaderToken.len);
    if (this.metadata.format.duration) {
      this.metadata.setFormat('bitrate', this.audioDataSize * 8 / this.metadata.format.duration);
    }
  }

  /**
   * Ref: http://www.wavpack.com/WavPack5FileFormat.pdf, 3.0 Metadata Sub-blocks
   * @param header Header
   * @param remainingLength Remaining length
   */
  private async parseMetadataSubBlock(header: IBlockHeader, remainingLength: number): Promise<void> {
    let remaining = remainingLength;
    while (remaining > MetadataIdToken.len) {
      const id = await this.tokenizer.readToken<IMetadataId>(MetadataIdToken);
      const dataSizeInWords = await this.tokenizer.readNumber(id.largeBlock ? Token.UINT24_LE : Token.UINT8);
      const data = new Uint8Array(dataSizeInWords * 2 - (id.isOddSize ? 1 : 0));
      await this.tokenizer.readBuffer(data);
      debug(`Metadata Sub-Blocks functionId=0x${id.functionId.toString(16)}, id.largeBlock=${id.largeBlock},data-size=${data.length}`);
      switch (id.functionId) {
        case 0x0: // ID_DUMMY: could be used to pad WavPack blocks
          break;

        case 0xe: { // ID_DSD_BLOCK
          debug('ID_DSD_BLOCK');
          // https://github.com/dbry/WavPack/issues/71#issuecomment-483094813
          const mp = 1 << Token.UINT8.get(data, 0);
          const samplingRate = header.flags.samplingRate * mp * 8; // ToDo: second factor should be read from DSD-metadata block https://github.com/dbry/WavPack/issues/71#issuecomment-483094813
          if (!header.flags.isDSD)
            throw new WavPackContentError('Only expect DSD block if DSD-flag is set');
          this.metadata.setFormat('sampleRate', samplingRate);
          this.metadata.setFormat('duration', header.totalSamples / samplingRate);
          break;
        }

        case 0x24: // ID_ALT_TRAILER: maybe used to embed original ID3 tag header
          debug('ID_ALT_TRAILER: trailer for non-wav files');
          break;

        case 0x26: // ID_MD5_CHECKSUM
          this.metadata.setFormat('audioMD5', data);
          break;

        case 0x2f: // ID_BLOCK_CHECKSUM
          debug(`ID_BLOCK_CHECKSUM: checksum=${uint8ArrayToHex(data)}`);
          break;

        default:
          debug(`Ignore unsupported meta-sub-block-id functionId=0x${id.functionId.toString(16)}`);
          break;
      }

      remaining -= MetadataIdToken.len + (id.largeBlock ? Token.UINT24_LE.len : Token.UINT8.len) + dataSizeInWords * 2;
      debug(`remainingLength=${remaining}`);
      if (id.isOddSize)
        this.tokenizer.ignore(1);
    }
    if (remaining !== 0) throw new WavPackContentError('metadata-sub-block should fit it remaining length');
  }

}
