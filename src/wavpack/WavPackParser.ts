import * as Token from 'token-types';

import { INativeAudioMetadata } from '../type';
import { APEv2Parser } from '../apev2/APEv2Parser';
import { FourCcToken } from '../common/FourCC';
import { BasicParser } from '../common/BasicParser';

/**
 * WavPack Block Header
 *
 * 32-byte little-endian header at the front of every WavPack block
 *
 * Ref:
 *  http://www.wavpack.com/WavPack5FileFormat.pdf (page 2/6: 2.0 "Block Header")
 */
interface IBlockHeader {
  // should be equal to 'wvpk' for WavPack
  BlockID: string,
  // size of entire block (minus 8)
  blockSize: number,
  //  0x402 to 0x410 are valid for decode
  version: number,
  // 40-bit block_index
  blockIndex: number,
  //  40-bit total samples for entire file (if block_index == 0 and a value of -1 indicates an unknown length)
  totalSamples: number,
  //  number of samples in this block, 0 = non-audio block
  blockSamples: number,
  // various flags for id and decoding
  flags: {
    // 00 = 1 byte / sample (1-8 bits / sample)
    // 01 = 2 bytes / sample (9-16 bits / sample)
    // 10 = 3 bytes / sample (15-24 bits / sample)
    // 11 = 4 bytes / sample (25-32 bits / sample)
    bitsPerSample: number,
    isMono: boolean,
    isHybrid: boolean
    isJointStereo: boolean,
    crossChannel: boolean,
    hybridNoiseShaping: boolean,
    floatingPoint: boolean,
    samplingRate: number,
    isDSD: boolean

    // false = PCM audio; true = DSD audio (ver 5.0+)
  }
  // crc for actual decoded data
  crc: Buffer
}

interface IMetadataId {
  /**
   * metadata function id
   */
  functionId: number,
  /**
   * If true, audio-decoder does not need to understand the metadata field
   */
  isOptional: boolean
  /**
   * actual data byte length is 1 less
   */
  actualDataByteLength: boolean
  /**
   * large block (> 255 words)
   */
  largeBlock: boolean
}

const SampleRates = [6000, 8000, 9600, 11025, 12000, 16000, 22050, 24000, 32000, 44100,
  48000, 64000, 88200, 96000, 192000, -1];

class WavPack {

  /**
   * WavPack Block Header
   *
   * 32-byte little-endian header at the front of every WavPack block
   *
   * Ref: http://www.wavpack.com/WavPack5FileFormat.pdf (page 2/6: 2.0 "Block Header")
   */
  public static BlockHeaderToken: Token.IGetToken<IBlockHeader> = {
    len: 32,

    get: (buf, off) => {

      const flags = Token.UINT32_LE.get(buf, off + 24);

      return {
        // should equal 'wvpk'
        BlockID: FourCcToken.get(buf, off),
        //  0x402 to 0x410 are valid for decode
        blockSize: Token.UINT32_LE.get(buf, off + 4),
        //  0x402 (1026) to 0x410 are valid for decode
        version: Token.UINT16_LE.get(buf, off + 8),
        //  40-bit total samples for entire file (if block_index == 0 and a value of -1 indicates an unknown length)
        totalSamples: (Token.UINT8.get(buf, off + 11) << 32) + Token.UINT32_LE.get(buf, off + 12),
        // 40-bit block_index
        blockIndex: (Token.UINT8.get(buf, off + 10) << 32) + Token.UINT32_LE.get(buf, off + 16),
        // 40-bit total samples for entire file (if block_index == 0 and a value of -1 indicates an unknown length)
        blockSamples: Token.UINT32_LE.get(buf, off + 20),
        // various flags for id and decoding
        flags: {
          bitsPerSample: (1 + WavPack.getBitAllignedNumber(flags, 0, 2)) * 8,
          isMono: WavPack.isBitSet(flags, 2),
          isHybrid: WavPack.isBitSet(flags, 3),
          isJointStereo: WavPack.isBitSet(flags, 4),
          crossChannel: WavPack.isBitSet(flags, 5),
          hybridNoiseShaping: WavPack.isBitSet(flags, 6),
          floatingPoint: WavPack.isBitSet(flags, 7),
          samplingRate: SampleRates[WavPack.getBitAllignedNumber(flags, 23, 4)],
          isDSD: WavPack.isBitSet(flags, 31)
        },
        // crc for actual decoded data
        crc: new Token.BufferType(4).get(buf, off + 28)
      };
    }
  };

  /**
   * 3.0 Metadata Sub-Blocks
   *  Ref: http://www.wavpack.com/WavPack5FileFormat.pdf (page 4/6: 3.0 "Metadata Sub-Block")
   */
  public static MetadataIdToken: Token.IGetToken<IMetadataId> = {
    len: 1,

    get: (buf, off) => {

      return {
        functionId: WavPack.getBitAllignedNumber(buf[off], 0, 6),
        isOptional: WavPack.isBitSet(buf[off], 5),
        actualDataByteLength: WavPack.isBitSet(buf[off], 6),
        largeBlock: WavPack.isBitSet(buf[off], 7)
      };
    }
  };

  private static isBitSet(flags: number, bitOffset: number): boolean {
    return WavPack.getBitAllignedNumber(flags, bitOffset, 1) === 1;
  }

  private static getBitAllignedNumber(flags: number, bitOffset: number, len: number): number {
    return (flags >>> bitOffset) & (0xffffffff >>> (32 - len));
  }
}

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
      if (header.BlockID !== 'wvpk') {
        throw new Error('Expected wvpk on beginning of file'); // ToDo: strip/parse JUNK
      }

      if (header.blockIndex === 0 && !this.metadata.format.dataformat) {
        this.metadata.setFormat('dataformat', 'WavPack');
        this.metadata.setFormat('lossless', !header.flags.isHybrid);
        // tagTypes: this.type,
        this.metadata.setFormat('bitsPerSample', header.flags.bitsPerSample);
        this.metadata.setFormat('sampleRate', header.flags.samplingRate);
        this.metadata.setFormat('numberOfChannels', header.flags.isMono ? 1 : 2);
        this.metadata.setFormat('duration', header.totalSamples / header.flags.samplingRate);
      }

      const ignoreBytes = header.blockSize - (WavPack.BlockHeaderToken.len - 8);

      if (header.blockIndex === 0 && header.blockSamples === 0) {
        // Meta-data block
        // console.log("End of WavPack");
        await this.parseMetadataSubBlock(ignoreBytes);
      } else {
        // console.log('Ignore: %s bytes', ignoreBytes);
        await this.tokenizer.ignore(ignoreBytes);
      }
    }
    while (true);
  }

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

        case 0x26: // ID_MD5_CHECKSUM
          this.metadata.setFormat('audioMD5', data);
          break;

        case 0x2F: // ID_BLOCK_CHECKSUM
          break;
      }

      remainingLength -= metadataSize;
    } while (remainingLength > 1);
  }

}
