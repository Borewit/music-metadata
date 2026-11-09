import { assert } from 'vitest';
import {
  concatBytes,
  decodeAscii,
  decodeUtf8,
  encodeUtf8,
  ensureAvailable,
  readBytes,
  readUInt8,
  readUInt16BE,
  readUInt24BE,
  readUInt32BE,
  readUInt32LE,
  readUInt64BE
} from '../lib/write/core/bytes.js';

const t = assert;

describe('write/core/bytes', () => {
  describe('readUInt*', () => {
    const data = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]);

    it('reads UInt8', () => {
      t.strictEqual(readUInt8(data, 0), 0x12);
      t.strictEqual(readUInt8(data, 3), 0x78);
    });

    it('reads UInt16BE', () => {
      t.strictEqual(readUInt16BE(data, 0), 0x1234);
      t.strictEqual(readUInt16BE(data, 2), 0x5678);
    });

    it('reads UInt24BE', () => {
      t.strictEqual(readUInt24BE(data, 0), 0x123456);
      t.strictEqual(readUInt24BE(data, 3), 0x789abc);
    });

    it('reads UInt32BE', () => {
      t.strictEqual(readUInt32BE(data, 0), 0x12345678);
      t.strictEqual(readUInt32BE(data, 4), 0x9abcdef0);
    });

    it('reads UInt32LE', () => {
      t.strictEqual(readUInt32LE(data, 0), 0x78563412);
      t.strictEqual(readUInt32LE(data, 4), 0xf0debc9a);
    });

    it('reads UInt64BE', () => {
      t.strictEqual(readUInt64BE(data, 0), 0x123456789abcdef0n);
    });
  });

  describe('readBytes', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);

    it('reads a slice', () => {
      const result = readBytes(data, 1, 3);
      t.deepEqual(result, new Uint8Array([2, 3, 4]));
    });

    it('reads to end', () => {
      const result = readBytes(data, 2, 3);
      t.deepEqual(result, new Uint8Array([3, 4, 5]));
    });
  });

  describe('decodeUtf8', () => {
    it('decodes ASCII', () => {
      const data = new Uint8Array([72, 101, 108, 108, 111]);
      t.strictEqual(decodeUtf8(data), 'Hello');
    });

    it('decodes UTF-8', () => {
      const data = new Uint8Array([0xe2, 0x9c, 0x93]); // ✓
      t.strictEqual(decodeUtf8(data), '✓');
    });
  });

  describe('decodeAscii', () => {
    it('decodes Latin-1', () => {
      const data = new Uint8Array([0xc0, 0xc1, 0xc2]); // ÀÁÂ
      t.strictEqual(decodeAscii(data), '\u00c0\u00c1\u00c2');
    });
  });

  describe('encodeUtf8', () => {
    it('encodes ASCII', () => {
      t.deepEqual(encodeUtf8('Hello'), new Uint8Array([72, 101, 108, 108, 111]));
    });

    it('encodes UTF-8', () => {
      t.deepEqual(encodeUtf8('✓'), new Uint8Array([0xe2, 0x9c, 0x93]));
    });
  });

  describe('concatBytes', () => {
    it('concatenates multiple arrays', () => {
      const a = new Uint8Array([1, 2]);
      const b = new Uint8Array([3, 4]);
      const c = new Uint8Array([5]);
      t.deepEqual(concatBytes(a, b, c), new Uint8Array([1, 2, 3, 4, 5]));
    });

    it('handles empty arrays', () => {
      const a = new Uint8Array([1, 2]);
      const b = new Uint8Array([]);
      t.deepEqual(concatBytes(a, b), new Uint8Array([1, 2]));
    });

    it('returns empty for no args', () => {
      t.deepEqual(concatBytes(), new Uint8Array([]));
    });
  });

  describe('ensureAvailable', () => {
    const data = new Uint8Array(10);

    it('passes for valid range', () => {
      ensureAvailable(data, 0, 10);
      ensureAvailable(data, 5, 5);
    });

    it('throws for negative offset', () => {
      t.throws(() => ensureAvailable(data, -1, 5), 'Invalid read range');
    });

    it('throws for negative length', () => {
      t.throws(() => ensureAvailable(data, 0, -1), 'Invalid read range');
    });

    it('throws for offset + length exceeding data', () => {
      t.throws(() => ensureAvailable(data, 5, 6), 'Unexpected end of data');
    });

    it('throws for non-safe integers', () => {
      t.throws(() => ensureAvailable(data, 1.5, 5), 'Invalid read range');
      t.throws(() => ensureAvailable(data, 0, 1.5), 'Invalid read range');
    });
  });
});
