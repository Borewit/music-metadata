import { textDecode } from '@borewit/text-codec';
import type { IGetToken } from 'strtok3';
import * as Token from 'token-types';
import { makeUnexpectedFileContentError } from '../ParseError.js';

export class CafContentError extends makeUnexpectedFileContentError('CAF') {}

// Application defined identifiers need not be printable ASCII, unlike FourCcToken
const decodeFourCC = (buf: Uint8Array, off: number): string => textDecode(buf.subarray(off, off + 4), 'latin1');

export interface ICafFileHeader {
  fileType: string;
  fileVersion: number;
  fileFlags: number;
}

export const FileHeader: IGetToken<ICafFileHeader> = {
  len: 8,

  get: (buf, off): ICafFileHeader => {
    return {
      fileType: decodeFourCC(buf, off),
      fileVersion: Token.UINT16_BE.get(buf, off + 4),
      fileFlags: Token.UINT16_BE.get(buf, off + 6)
    };
  }
};

export interface ICafChunkHeader {
  chunkType: string;
  /** Size of the data section, -1 if the Audio Data chunk runs to the end of file */
  chunkSize: number;
}

export const ChunkHeader: IGetToken<ICafChunkHeader> = {
  len: 12,

  get: (buf, off): ICafChunkHeader => {
    return {
      chunkType: decodeFourCC(buf, off),
      chunkSize: Number(Token.INT64_BE.get(buf, off + 4))
    };
  }
};

export interface IAudioDescription {
  sampleRate: number;
  formatId: string;
  formatFlags: number;
  bytesPerPacket: number;
  framesPerPacket: number;
  channelsPerFrame: number;
  bitsPerChannel: number;
}

/** CAFAudioFormat: Float64 mSampleRate followed by six UInt32 fields */
export const AudioDescription: IGetToken<IAudioDescription> = {
  len: 32,

  get: (buf, off): IAudioDescription => {
    return {
      sampleRate: Token.Float64_BE.get(buf, off),
      formatId: decodeFourCC(buf, off + 8),
      formatFlags: Token.UINT32_BE.get(buf, off + 12),
      bytesPerPacket: Token.UINT32_BE.get(buf, off + 16),
      framesPerPacket: Token.UINT32_BE.get(buf, off + 20),
      channelsPerFrame: Token.UINT32_BE.get(buf, off + 24),
      bitsPerChannel: Token.UINT32_BE.get(buf, off + 28)
    };
  }
};

export interface IPacketTableHeader {
  numberPackets: number;
  numberValidFrames: number;
  primingFrames: number;
  remainderFrames: number;
}

/** Fixed 24 byte part of a Packet Table chunk */
export const PacketTableHeader: IGetToken<IPacketTableHeader> = {
  len: 24,

  get: (buf, off): IPacketTableHeader => {
    return {
      numberPackets: Number(Token.INT64_BE.get(buf, off)),
      numberValidFrames: Number(Token.INT64_BE.get(buf, off + 8)),
      primingFrames: Token.INT32_BE.get(buf, off + 16),
      remainderFrames: Token.INT32_BE.get(buf, off + 20)
    };
  }
};

// A variable bytes or frames per packet value contributes one entry each
function varIntsPerPacket(desc: IAudioDescription): number {
  return (desc.bytesPerPacket === 0 ? 1 : 0) + (desc.framesPerPacket === 0 ? 1 : 0);
}

/**
 * Decodes the base-128, MSB-first integers that follow a Packet Table header,
 * high-order bit set meaning the number continues in the next byte.
 * @returns number of bytes occupied by the entries
 */
export function decodePacketTableEntries(body: Uint8Array, desc: IAudioDescription, numberPackets: number): number {
  const expected = numberPackets * varIntsPerPacket(desc);

  if (expected === 0) {
    return 0;
  }
  // Each entry needs at least one byte, checked up front to bound the loop
  if (expected > body.length) {
    throw new CafContentError(
      `Packet Table data section holds ${body.length} byte(s) for ${expected} packet table entries`
    );
  }

  let offset = 0;
  for (let i = 0; i < expected; ++i) {
    let byte: number;
    do {
      if (offset >= body.length) {
        throw new CafContentError('Packet Table data section ends in the middle of a variable length integer');
      }
      byte = body[offset++];
    } while ((byte & 0x80) !== 0);
  }
  return offset;
}

export interface IChannelLayoutHeader {
  channelLayoutTag: number;
  channelBitmap: number;
  numberChannelDescriptions: number;
}

/** Leading 12 bytes of a Channel Layout chunk, mChannelBitmap is always present */
export const ChannelLayoutHeader: IGetToken<IChannelLayoutHeader> = {
  len: 12,

  get: (buf, off): IChannelLayoutHeader => {
    return {
      channelLayoutTag: Token.UINT32_BE.get(buf, off),
      channelBitmap: Token.UINT32_BE.get(buf, off + 4),
      numberChannelDescriptions: Token.UINT32_BE.get(buf, off + 8)
    };
  }
};

export interface IChannelDescription {
  channelLabel: number;
  channelFlags: number;
  coordinates: [number, number, number];
}

export const channelDescriptionLen = 20;

/** Each CAFChannelDescription has a UInt32 label, UInt32 flags and three Float32 coordinates */
export function parseChannelDescriptions(body: Uint8Array, count: number): IChannelDescription[] {
  if (count * channelDescriptionLen > body.length) {
    throw new CafContentError(`Channel Layout chunk declares ${count} description(s) for ${body.length} byte(s)`);
  }
  const descriptions: IChannelDescription[] = [];
  for (let i = 0; i < count; ++i) {
    const off = i * channelDescriptionLen;
    descriptions.push({
      channelLabel: Token.UINT32_BE.get(body, off),
      channelFlags: Token.UINT32_BE.get(body, off + 4),
      coordinates: [
        Token.Float32_BE.get(body, off + 8),
        Token.Float32_BE.get(body, off + 12),
        Token.Float32_BE.get(body, off + 16)
      ]
    });
  }
  return descriptions;
}

export interface IInfoEntry {
  key: string;
  value: string;
}

/** Reads the NUL terminated UTF-8 pairs, the declared entry count is authoritative */
export function parseInfoEntries(body: Uint8Array): IInfoEntry[] {
  const readString = (from: number): { value: string; next: number } => {
    const end = body.indexOf(0, from);
    if (end < 0) {
      throw new CafContentError('Information chunk contains an unterminated string');
    }
    return { value: textDecode(body.subarray(from, end), 'utf8'), next: end + 1 };
  };

  const numEntries = Token.UINT32_BE.get(body, 0);
  const entries: IInfoEntry[] = [];
  let offset = 4;
  for (let i = 0; i < numEntries; ++i) {
    const key = readString(offset);
    const value = readString(key.next);
    entries.push({ key: key.value, value: value.value });
    offset = value.next;
  }
  return entries;
}
