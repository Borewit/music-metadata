import initDebug from 'debug';
import type { IGetToken, ITokenizer } from 'strtok3';
import * as Token from 'token-types';

import * as util from '../../common/Util.js';
import { MusepackContentError } from '../MusepackConentError.js';

const debug = initDebug('music-metadata:parser:musepack:sv8');

const PacketKey = new Token.StringType(2, 'latin1');

interface IVarSize {
  len: number;
  value: number;
}

export interface IPacketHeader {
  key: string;
  payloadLength: number;
}

/**
 * Stream Header Packet
 * Ref: http://trac.musepack.net/musepack/wiki/SV8Specification#StreamHeaderPacket
 */
interface IStreamHeader1 {
  crc: number;
  streamVersion: number;
}

/**
 * Stream Header Packet part 1
 * Ref: http://trac.musepack.net/musepack/wiki/SV8Specification#StreamHeaderPacket
 */
const SH_part1: IGetToken<IStreamHeader1> = {
  len: 5,

  get: (buf, off) => {
    return {
      crc: Token.UINT32_LE.get(buf, off),
      streamVersion: Token.UINT8.get(buf, off + 4)
    };
  }
};

/**
 * Stream Header Packet
 * Ref: http://trac.musepack.net/musepack/wiki/SV8Specification#StreamHeaderPacket
 */
interface IStreamHeader3 {
  sampleFrequency: number;
  maxUsedBands: number;
  channelCount: number;
  msUsed: boolean;
  audioBlockFrames: number;
}

/**
 * Stream Header Packet part 3
 * Ref: http://trac.musepack.net/musepack/wiki/SV8Specification#StreamHeaderPacket
 */
const SH_part3: IGetToken<IStreamHeader3> = {
  len: 2,

  get: (buf, off) => {
    return {
      sampleFrequency: [44100, 48000, 37800, 32000][util.getBitAllignedNumber(buf, off, 0, 3)],
      maxUsedBands: util.getBitAllignedNumber(buf, off, 3, 5),
      channelCount: util.getBitAllignedNumber(buf, off + 1, 0, 4) + 1,
      msUsed: util.isBitSet(buf, off + 1, 4),
      audioBlockFrames: util.getBitAllignedNumber(buf, off + 1, 5, 3)
    };
  }
};

/**
 * Stream Header Packet
 * Ref: http://trac.musepack.net/musepack/wiki/SV8Specification#StreamHeaderPacket
 */
interface IStreamHeader extends IStreamHeader1, IStreamHeader3 {
  sampleCount: number;
  beginningOfSilence: number;
}

export class StreamReader {
  private _tokenizer: ITokenizer;

  public get tokenizer(): ITokenizer {
    return this._tokenizer;
  }
  public set tokenizer(value: ITokenizer) {
    this._tokenizer = value;
  }

  public constructor(_tokenizer: ITokenizer) {
    this._tokenizer = _tokenizer;
  }

  public async readPacketHeader(): Promise<IPacketHeader> {
    const key = await this.tokenizer.readToken<string>(PacketKey);
    const size = await this.readVariableSizeField();
    const headerLength = PacketKey.len + size.len;
    if (size.value < headerLength) {
      throw new MusepackContentError(`Invalid packet size: ${size.value}`);
    }
    return {
      key,
      payloadLength: size.value - headerLength
    };
  }

  public async readStreamHeader(size: number): Promise<IStreamHeader> {
    const streamHeader: IStreamHeader = {} as unknown as IStreamHeader;
    debug(`Reading SH at offset=${this.tokenizer.position}`);

    const part1 = await this.tokenizer.readToken(SH_part1);
    size -= SH_part1.len;
    Object.assign(streamHeader, part1);
    debug(`SH.streamVersion = ${part1.streamVersion}`);

    const sampleCount = await this.readVariableSizeField();
    size -= sampleCount.len;
    streamHeader.sampleCount = sampleCount.value;

    const bs = await this.readVariableSizeField();
    size -= bs.len;
    streamHeader.beginningOfSilence = bs.value;

    const part3 = await this.tokenizer.readToken(SH_part3);
    size -= SH_part3.len;
    Object.assign(streamHeader, part3);
    // assert.equal(size, 0);
    await this.tokenizer.ignore(size);
    return streamHeader;
  }

  private async readVariableSizeField(): Promise<IVarSize> {
    let value = 0;
    for (let len = 1; len <= 9; ++len) {
      const byte = await this.tokenizer.readNumber(Token.UINT8);
      const digit = byte & 0x7f;
      if (value > (Number.MAX_SAFE_INTEGER - digit) / 128) {
        throw new MusepackContentError('Variable-size integer exceeds JavaScript safe integer range');
      }
      value = value * 128 + digit;
      if ((byte & 0x80) === 0) {
        return { len, value };
      }
    }
    throw new MusepackContentError('Variable-size integer exceeds 9 bytes');
  }
}
