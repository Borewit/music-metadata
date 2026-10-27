import initDebug from 'debug';
import { EndOfStreamError } from 'strtok3';
import * as Token from 'token-types';
import { uint8ArrayToHex } from 'uint8array-extras';
import { tryParseApeHeader } from '../apev2/APEv2Parser.js';
import { BasicParser } from '../common/BasicParser.js';
import { FourCcToken } from '../common/FourCC.js';
import { makeUnexpectedFileContentError } from '../ParseError.js';
import { BlockHeaderToken, type IBlockHeader, type IMetadataId, MetadataIdToken } from './WavPackToken.js';

const debug = initDebug('music-metadata:parser:WavPack');

export class WavPackContentError extends makeUnexpectedFileContentError('WavPack') {}

/**
 * WavPack Parser
 */
export class WavPackParser extends BasicParser {
  private audioDataSize = 0;
  private sampleRate = 0;
  private dsdMultiplier = 1;
  private physicalEof = false;

  public async parse(): Promise<void> {
    this.metadata.setAudioOnly();

    this.audioDataSize = 0;

    // First parse all WavPack blocks
    await this.parseWavPackBlocks();
    if (this.physicalEof) {
      return;
    }
    // try to parse APEv2 header

    return tryParseApeHeader(this.metadata, this.tokenizer, this.options);
  }

  public async parseWavPackBlocks(): Promise<void> {
    let totalSamples: number | undefined;
    let sampleExtent = 0;
    let groupIndex: number | undefined;
    let groupSamples = 0;
    let complete = true;
    let isDsd = false;
    const preamble = new Uint8Array(4);
    while (true) {
      if ((await this.tokenizer.peekBuffer(preamble, { mayBeLess: true })) < 4) {
        this.physicalEof = true;
        break;
      }
      const blockId = FourCcToken.get(preamble, 0);
      if (blockId !== 'wvpk') {
        break;
      }

      const header = await this.tokenizer.readToken<IBlockHeader>(BlockHeaderToken);
      if (header.BlockID !== 'wvpk') {
        throw new WavPackContentError('Invalid WavPack Block-ID');
      }

      debug(`WavPack header blockIndex=${header.blockIndex}, len=${BlockHeaderToken.len}`);

      if (header.blockIndex === 0 && !this.metadata.format.container) {
        this.metadata.setFormat('container', 'WavPack');
        this.metadata.setFormat('lossless', !header.flags.isHybrid);
        // tagTypes: this.type,
        this.metadata.setFormat('bitsPerSample', header.flags.bitsPerSample);
        this.sampleRate = header.flags.samplingRate;
        isDsd = header.flags.isDSD;
        totalSamples = header.totalSamples > 0 ? header.totalSamples : undefined;
        this.metadata.setFormat('numberOfChannels', header.flags.isMono ? 1 : 2);
        this.metadata.setFormat('codec', header.flags.isDSD ? 'DSD' : 'PCM');
      }

      const ignoreBytes = header.blockSize - (BlockHeaderToken.len - 8);
      if (
        ignoreBytes < 0 ||
        (this.tokenizer.fileInfo.size !== undefined &&
          ignoreBytes > this.tokenizer.fileInfo.size - this.tokenizer.position)
      ) {
        throw new WavPackContentError('WavPack block exceeds available input');
      }

      if (header.blockIndex === 0) {
        await this.parseMetadataSubBlock(header, ignoreBytes);
      } else if ((await this.tokenizer.ignore(ignoreBytes)) !== ignoreBytes) {
        throw new EndOfStreamError();
      }
      if (header.blockSamples > 0) {
        // Channel blocks share an index and sample count; advance only when the group is complete.
        if (header.flags.isInitialBlock) {
          complete &&= groupIndex === undefined && header.blockIndex === sampleExtent;
          groupIndex = header.blockIndex;
          groupSamples = header.blockSamples;
        }
        complete &&=
          groupIndex === header.blockIndex && groupSamples === header.blockSamples && isDsd === header.flags.isDSD;
        if (header.flags.isFinalBlock) {
          sampleExtent = header.blockIndex + header.blockSamples;
          groupIndex = undefined;
        }
        this.audioDataSize += header.blockSize; // Count audio data for bit-rate calculation
      }
    }
    if (totalSamples === undefined && complete && groupIndex === undefined && sampleExtent > 0) {
      totalSamples = sampleExtent * (isDsd ? 8 : 1);
    } else if (totalSamples === undefined && (!complete || groupIndex !== undefined)) {
      this.metadata.addWarning('Cannot determine WavPack duration from incomplete or non-contiguous blocks');
    }
    const samplingRate = this.sampleRate * this.dsdMultiplier;
    if (samplingRate > 0 && Number.isSafeInteger(samplingRate)) {
      this.metadata.setFormat('sampleRate', samplingRate);
    }
    if (totalSamples !== undefined) {
      this.metadata.setFormat('numberOfSamples', totalSamples);
      const rate = this.metadata.format.sampleRate;
      if (rate && rate > 0) {
        this.metadata.setFormat('duration', totalSamples / rate);
      }
    }
    if (this.metadata.format.duration) {
      this.metadata.setFormat('bitrate', (this.audioDataSize * 8) / this.metadata.format.duration);
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
      const headerSize = MetadataIdToken.len + (id.largeBlock ? Token.UINT24_LE.len : Token.UINT8.len);
      if (dataSizeInWords * 2 > remaining - headerSize) {
        throw new WavPackContentError('Metadata sub-block exceeds its enclosing block');
      }
      const data = await this.readToken(new Token.Uint8ArrayType(dataSizeInWords * 2 - (id.isOddSize ? 1 : 0)));
      debug(
        `Metadata Sub-Blocks functionId=0x${id.functionId.toString(16)}, id.largeBlock=${id.largeBlock},data-size=${data.length}`
      );
      switch (id.functionId) {
        case 0x0: // ID_DUMMY: could be used to pad WavPack blocks
          break;

        case 0xe: {
          // ID_DSD_BLOCK
          debug('ID_DSD_BLOCK');
          // https://github.com/dbry/WavPack/issues/71#issuecomment-483094813
          if (data.length < 1) {
            throw new WavPackContentError('Truncated WavPack DSD metadata');
          }
          const mp = 2 ** Token.UINT8.get(data, 0);
          this.dsdMultiplier = mp * 8;
          if (!header.flags.isDSD) {
            throw new WavPackContentError('Only expect DSD block if DSD-flag is set');
          }
          break;
        }
        case 0x27:
          if (data.length < 3) {
            throw new WavPackContentError('Truncated WavPack sample rate');
          }
          this.sampleRate = Token.UINT24_LE.get(data, 0);
          break;

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
      if (id.isOddSize) {
        await this.tokenizer.ignore(1);
      }
    }
    if (remaining !== 0) {
      throw new WavPackContentError('metadata-sub-block should fit it remaining length');
    }
  }
}
