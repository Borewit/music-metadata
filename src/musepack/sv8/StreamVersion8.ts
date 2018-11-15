import * as Token from 'token-types';
import Util from '../../common/Util';
import { ITokenizer } from 'strtok3/lib/type';
import * as initDebug from 'debug';

const debug = initDebug('music-metadata:parser:musepack:sv8');

const PacketKey = new Token.StringType(2, 'binary');

interface IVarSize {
  len: number,
  value: number
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
const SH_part1: Token.IGetToken<IStreamHeader1> = {
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
const SH_part3: Token.IGetToken<IStreamHeader3> = {
  len: 2,

  get: (buf, off) => {

    return {
      sampleFrequency: [44100, 48000, 37800, 32000][Util.getBitAllignedNumber(buf, off, 0, 3)],
      maxUsedBands: Util.getBitAllignedNumber(buf, off, 3, 5),
      channelCount: Util.getBitAllignedNumber(buf, off + 1, 0, 4) + 1,
      msUsed: Util.isBitSet(buf, off + 1, 4),
      audioBlockFrames: Util.getBitAllignedNumber(buf, off + 1, 5, 3)
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

  public constructor(private tokenizer: ITokenizer) {
  }

  public readPacketHeader(): Promise<IPacketHeader> {

    return this.tokenizer.readToken(PacketKey).then(key => {
      return this.readVariableSizeField()
        .then(size => {
          return {
            key,
            payloadLength: size.value - 2 - size.len
          };
        });
    });
  }

  public readStreamHeader(size: number): Promise<IStreamHeader> {

    const streamHeader: IStreamHeader = {} as any;

    debug(`Reading SH at offset=${this.tokenizer.position}`);
    return this.tokenizer.readToken(SH_part1).then(part1 => {
      size -= SH_part1.len;
      Object.assign(streamHeader, part1);
      debug(`SH.streamVersion = ${part1.streamVersion}`);
      return this.readVariableSizeField();
    }).then(sampleCount => {
      size -= sampleCount.len;
      streamHeader.sampleCount = sampleCount.value;
      return this.readVariableSizeField();
    }).then(bs => {
      size -= bs.len;
      streamHeader.beginningOfSilence = bs.value;
      return this.tokenizer.readToken(SH_part3);
    }).then(part3 => {
      size -= SH_part3.len;
      Object.assign(streamHeader, part3);
      // assert.equal(size, 0);
      return this.tokenizer.ignore(size);
    }).then(() => {
      return streamHeader;
    });
  }

  private readVariableSizeField(len: number = 1, hb: number = 0): Promise<IVarSize> {
    return this.tokenizer.readToken(Token.UINT8).then(n => {
      if ((n & 0x80) === 0) {
        return {len, value: hb + n};
      }
      n &= 0x7F;
      n += hb;
      return this.readVariableSizeField(len + 1, n << 7);
    });
  }
}
