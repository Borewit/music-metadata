import { getBitAllignedNumber, isBitSet } from "../../common/Util";
import initDebug from "../../debug";
import { UINT32_LE, UINT8 } from "../../token-types";
import { Latin1StringType } from "../../token-types/string";

import type { ITokenizer, IGetToken } from "../../strtok3";

const debug = initDebug("music-metadata:parser:musepack:sv8");

const PacketKey = new Latin1StringType(2);

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
      crc: UINT32_LE.get(buf, off),
      streamVersion: UINT8.get(buf, off + 4),
    };
  },
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
      sampleFrequency: [44_100, 48_000, 37_800, 32_000][getBitAllignedNumber(buf, off, 0, 3)],
      maxUsedBands: getBitAllignedNumber(buf, off, 3, 5),
      channelCount: getBitAllignedNumber(buf, off + 1, 0, 4) + 1,
      msUsed: isBitSet(buf, off + 1, 4),
      audioBlockFrames: getBitAllignedNumber(buf, off + 1, 5, 3),
    };
  },
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
  public constructor(private tokenizer: ITokenizer) {}

  public async readPacketHeader(): Promise<IPacketHeader> {
    const key = await this.tokenizer.readToken<string>(PacketKey);
    const size = await this.readVariableSizeField();
    return {
      key,
      payloadLength: size.value - 2 - size.len,
    };
  }

  public async readStreamHeader(size: number): Promise<IStreamHeader> {
    const streamHeader: IStreamHeader = {} as any;
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

  private async readVariableSizeField(len = 1, hb = 0): Promise<IVarSize> {
    let n = await this.tokenizer.readNumber(UINT8);
    if ((n & 0x80) === 0) {
      return { len, value: hb + n };
    }
    n &= 0x7f;
    n += hb;
    return this.readVariableSizeField(len + 1, n << 7);
  }
}
