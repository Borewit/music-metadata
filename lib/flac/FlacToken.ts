import type { IGetToken } from 'strtok3';
import { UINT16_BE, UINT24_BE, Uint8ArrayType } from 'token-types';
import * as util from '../common/Util.js';
import { makeUnexpectedFileContentError } from '../ParseError.js';

export {
  BlockHeader,
  BlockType,
  type IBlockHeader
} from '../tokens/flac.js';

class FlacContentError extends makeUnexpectedFileContentError('FLAC') {}

/**
 * METADATA_BLOCK_DATA
 * Ref: https://xiph.org/flac/format.html#metadata_block_streaminfo
 */
export interface IBlockStreamInfo {
  minimumBlockSize: number;
  maximumBlockSize: number;
  minimumFrameSize: number;
  maximumFrameSize: number;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  totalSamples: number;
  fileMD5: Uint8Array;
}

export const BlockStreamInfo: IGetToken<IBlockStreamInfo> = {
  len: 34,

  get: (buf: Uint8Array, off: number): IBlockStreamInfo => {
    return {
      minimumBlockSize: UINT16_BE.get(buf, off),
      maximumBlockSize: UINT16_BE.get(buf, off + 2),
      minimumFrameSize: UINT24_BE.get(buf, off + 4),
      maximumFrameSize: UINT24_BE.get(buf, off + 7),
      sampleRate: UINT24_BE.get(buf, off + 10) >> 4,
      channels: util.getBitAllignedNumber(buf, off + 12, 4, 3) + 1,
      bitsPerSample: util.getBitAllignedNumber(buf, off + 12, 7, 5) + 1,
      totalSamples: util.getBitAllignedNumber(buf, off + 13, 4, 36),
      fileMD5: new Uint8ArrayType(16).get(buf, off + 18)
    };
  }
};

/**
 * CRC-8 lookup table for FLAC frame header CRC.
 * Polynomial: x^8 + x^2 + x^1 + 1 (0x07), init: 0x00.
 */
const FLAC_CRC8_TABLE: Uint8Array = (() => {
  const table = new Uint8Array(256);
  for (let i = 0; i < 256; ++i) {
    let crc = i;
    for (let j = 0; j < 8; ++j) {
      crc = (crc & 0x80) !== 0 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
    }
    table[i] = crc;
  }
  return table;
})();

function computeCrc8(data: Uint8Array, start: number, end: number): number {
  let crc = 0;
  for (let i = start; i < end; ++i) {
    crc = FLAC_CRC8_TABLE[crc ^ data[i]];
  }
  return crc;
}

/**
 * UTF-8 coded number as used in FLAC frame headers for frame/coded sample numbers.
 * Reads from `buf` at `offset`, returns { value, bytesRead }.
 */
function readUtf8CodedNumber(buf: Uint8Array, offset: number): { value: number; bytesRead: number } {
  if (offset >= buf.length) {
    throw new FlacContentError('Missing UTF-8 coded number');
  }
  const first = buf[offset];
  if (first < 0x80) {
    return { value: first, bytesRead: 1 };
  }
  let length = 0;
  let mask = 0x80;
  while ((first & mask) !== 0) {
    ++length;
    mask >>= 1;
    if (length > 7) {
      throw new FlacContentError('UTF-8 coded number exceeds 7 bytes');
    }
  }
  if (length < 2 || offset + length > buf.length) {
    throw new FlacContentError('Invalid or truncated UTF-8 coded number');
  }
  let value = first & (0x7f >> length);
  for (let i = 1; i < length; ++i) {
    const continuation = buf[offset + i];
    if ((continuation & 0xc0) !== 0x80) {
      throw new FlacContentError('Invalid UTF-8 coded number continuation byte');
    }
    value = value * 64 + (continuation & 0x3f);
  }
  return { value, bytesRead: length };
}

/**
 * FLAC frame header fields parsed from the raw header bytes.
 * Ref: https://xiph.org/flac/format.html#frame
 */
export interface IFlacFrameHeader {
  /** Blocking strategy: false = fixed-blocksize, true = variable-blocksize. */
  readonly blockingStrategy: boolean;
  /** Block size in samples. */
  readonly blockSize: number;
  /** Sample rate in Hz (when known from header bits). */
  readonly sampleRate: number | undefined;
  /** Channel assignment (0-10). */
  readonly channelAssignment: number;
  /** Sample size bits (0 = from STREAMINFO, 1=8, 2=12, 4=16, etc.). */
  readonly sampleSizeBits: number;
  /** Frame number (fixed-blocksize) or coded sample number (variable-blocksize). */
  readonly number: number;
  /** Total bytes of the frame header, including CRC-8 (before subframes). */
  readonly headerBytes: number;
  /** CRC-8 byte position within the input buffer (including the starting offset). */
  readonly crc8Position: number;
  /** Stored CRC-8 value. */
  readonly storedCrc8: number;
}

/**
 * Parse a FLAC frame header from `buf` starting at `offset`.
 * Returns the parsed header or throws if the sync code is invalid.
 * Does not validate CRC-8; callers should call `validateFlacFrameCrc8` separately.
 */
export function parseFlacFrameHeader(buf: Uint8Array, offset: number): IFlacFrameHeader {
  if (!Number.isSafeInteger(offset) || offset < 0 || buf.length - offset < 6) {
    throw new FlacContentError(`Truncated or invalid FLAC frame header at offset ${offset}`);
  }
  if (buf[offset] !== 0xff) {
    throw new FlacContentError(`Invalid FLAC frame sync byte at offset ${offset}: 0x${buf[offset].toString(16)}`);
  }
  const b1 = buf[offset + 1];
  if ((b1 & 0xfc) !== 0xf8) {
    throw new FlacContentError(`Invalid FLAC frame sync code at offset ${offset}`);
  }
  const reservedBit = (b1 & 0x02) !== 0;
  if (reservedBit) {
    throw new FlacContentError(`FLAC frame reserved bit set at offset ${offset}`);
  }
  const blockingStrategy = (b1 & 0x01) !== 0;

  const b2 = buf[offset + 2];
  const blockSizeBits = (b2 >> 4) & 0x0f;
  const sampleRateBits = b2 & 0x0f;

  const b3 = buf[offset + 3];
  const channelAssignment = (b3 >> 4) & 0x0f;
  const sampleSizeBits = (b3 >> 1) & 0x07;
  const sampleSizeReserved = b3 & 0x01;
  if (channelAssignment > 10 || sampleSizeBits === 3) {
    throw new FlacContentError(`FLAC frame reserved channel assignment or sample size at offset ${offset}`);
  }
  if (sampleSizeReserved !== 0) {
    throw new FlacContentError(`FLAC frame sample size reserved bit set at offset ${offset}`);
  }

  let blockSize: number;
  if (blockSizeBits === 0x00) {
    throw new FlacContentError(`FLAC frame block size bits reserved at offset ${offset}`);
  }
  if (blockSizeBits === 0x01) {
    blockSize = 192;
  } else if (blockSizeBits >= 0x02 && blockSizeBits <= 0x05) {
    blockSize = 576 * 2 ** (blockSizeBits - 2);
  } else {
    blockSize = 2 ** blockSizeBits;
  }

  let sampleRate: number | undefined;
  const sampleRateTable: Record<number, number> = {
    0x01: 88200,
    0x02: 176400,
    0x03: 192000,
    0x04: 8000,
    0x05: 16000,
    0x06: 22050,
    0x07: 24000,
    0x08: 32000,
    0x09: 44100,
    0x0a: 48000,
    0x0b: 96000
  };
  if (sampleRateBits >= 0x01 && sampleRateBits <= 0x0b) {
    sampleRate = sampleRateTable[sampleRateBits];
  } else if (sampleRateBits === 0x0f) {
    throw new FlacContentError(`FLAC frame sample rate bits forbidden at offset ${offset}`);
  }

  let pos = offset + 4;
  const coded = readUtf8CodedNumber(buf, pos);
  const number = coded.value;
  pos += coded.bytesRead;
  if (!blockingStrategy && number > 0x7fffffff) {
    throw new FlacContentError('FLAC frame number exceeds 31 bits');
  }

  const blockSizeBytes = blockSizeBits === 0x06 ? 1 : blockSizeBits === 0x07 ? 2 : 0;
  const sampleRateBytes = sampleRateBits === 0x0c ? 1 : sampleRateBits === 0x0d || sampleRateBits === 0x0e ? 2 : 0;
  if (pos + blockSizeBytes + sampleRateBytes >= buf.length) {
    throw new FlacContentError('Truncated FLAC frame extensions or missing CRC-8');
  }

  if (blockSizeBits === 0x06) {
    blockSize = buf[pos] + 1;
  } else if (blockSizeBits === 0x07) {
    blockSize = UINT16_BE.get(buf, pos) + 1;
    if (blockSize === 65536) {
      throw new FlacContentError('FLAC frame block size 65536 is forbidden');
    }
  }
  pos += blockSizeBytes;

  if (sampleRateBits === 0x0c) {
    sampleRate = buf[pos] * 1000;
  } else if (sampleRateBits === 0x0d || sampleRateBits === 0x0e) {
    sampleRate = UINT16_BE.get(buf, pos) * (sampleRateBits === 0x0e ? 10 : 1);
  }
  pos += sampleRateBytes;
  const crc8Position = pos;
  const storedCrc8 = buf[pos++];

  return {
    blockingStrategy,
    blockSize,
    sampleRate,
    channelAssignment,
    sampleSizeBits,
    number,
    headerBytes: pos - offset,
    crc8Position,
    storedCrc8
  };
}

/**
 * Validate CRC-8 of a FLAC frame header.
 * `buf` must contain the full header bytes, `crc8Position` is the offset of the CRC byte within `buf`.
 */
export function validateFlacFrameCrc8(buf: Uint8Array, crc8Position: number, storedCrc8: number): boolean {
  if (!Number.isSafeInteger(crc8Position) || crc8Position < 0 || crc8Position >= buf.length) {
    return false;
  }
  const computed = computeCrc8(buf, 0, crc8Position);
  return computed === storedCrc8;
}

/**
 * Number of channels for a given FLAC channel assignment code.
 * Ref: https://xiph.org/flac/format.html#frame
 */
export function flacChannelCount(channelAssignment: number): number {
  switch (channelAssignment) {
    case 0:
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
    case 7:
      return channelAssignment + 1;
    case 8:
    case 9:
    case 10:
      return 2;
    default:
      return 1;
  }
}
