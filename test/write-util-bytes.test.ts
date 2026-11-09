import { TokenWriter } from 'strtok3';
import { StringType, UINT16_BE, UINT24_BE, UINT32_BE, UINT32_LE, Uint8ArrayType } from 'token-types';
import { describe, expect, it } from 'vitest';
import { InvalidFileError } from '../lib/index.js';
import {
  concatBytes,
  decodeUtf8,
  encodeUtf8,
  readUInt16BE,
  readUInt24BE,
  readUInt32BE,
  readUInt32LE,
  readUInt64BE
} from '../lib/write/core/bytes.js';

describe('TokenWriter integration', () => {
  it('writes and patches token-types tokens with strtok3', () => {
    const writer = new TokenWriter(2);
    expect(writer.writeToken(UINT16_BE, 0x1234)).toBe(2);
    expect(writer.writeToken(UINT24_BE, 0x56789a)).toBe(3);
    const offset = writer.reserve(4);
    writer.patchToken(UINT32_BE, offset, 0x01020304);
    writer.writeToken(UINT32_LE, 0x3456789a);
    expect(writer.writeBuffer(Uint8Array.from([0xaa]))).toBe(1);
    expect(writer.writeZeros(2)).toBe(2);

    const data = writer.toUint8Array();
    expect(Array.from(data)).toEqual([0x12, 0x34, 0x56, 0x78, 0x9a, 1, 2, 3, 4, 0x9a, 0x78, 0x56, 0x34, 0xaa, 0, 0]);
    expect(readUInt16BE(data, 0)).toBe(0x1234);
    expect(readUInt24BE(data, 2)).toBe(0x56789a);
    expect(readUInt32BE(data, 5)).toBe(0x01020304);
    expect(readUInt32LE(data, 9)).toBe(0x3456789a);
  });

  it('writes fixed-size string and byte tokens', () => {
    const writer = new TokenWriter();
    expect(writer.writeToken(new StringType(4, 'ascii'), 'fLaC')).toBe(4);
    expect(writer.writeToken(new Uint8ArrayType(3), Uint8Array.from([1, 2, 3]))).toBe(3);

    const data = writer.toUint8Array();
    expect(Array.from(data)).toEqual([0x66, 0x4c, 0x61, 0x43, 1, 2, 3]);
    expect(new StringType(4, 'ascii').get(data, 0)).toBe('fLaC');
    expect(Array.from(new Uint8ArrayType(3).get(data, 4))).toEqual([1, 2, 3]);
  });

  it('grows beyond the initial capacity', () => {
    const writer = new TokenWriter(1);
    writer.writeBuffer(new Uint8Array(10_000).fill(7));
    expect(writer.length).toBe(10_000);
    expect(writer.toUint8Array()[9999]).toBe(7);
  });

  it('rejects out-of-range patches', () => {
    const writer = new TokenWriter();
    writer.writeToken(UINT32_BE, 0);
    expect(() => writer.patchToken(UINT32_BE, 1, 1)).toThrow(RangeError);
  });
});

describe('byte helpers', () => {
  it('concatenates and encodes UTF-8', () => {
    const text = 'héllo 世界';
    const encoded = encodeUtf8(text);
    expect(decodeUtf8(encoded)).toBe(text);

    const combined = concatBytes(Uint8Array.from([1, 2]), Uint8Array.from([3]), Uint8Array.from([4, 5]));
    expect(Array.from(combined)).toEqual([1, 2, 3, 4, 5]);
  });

  it('reads 64-bit big-endian integers', () => {
    const data = Uint8Array.from([0, 0, 0, 1, 0, 0, 0, 2]);
    expect(readUInt64BE(data, 0)).toBe(0x0000000100000002n);
  });

  it('throws on truncated reads', () => {
    expect(() => readUInt32BE(Uint8Array.from([1, 2, 3]), 0)).toThrow(InvalidFileError);
  });
});
