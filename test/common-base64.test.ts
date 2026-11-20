import { assert, expect, vi } from 'vitest';
import { decodeBase64, encodeBase64 } from '../lib/common/Base64.js';

const t = assert;

describe('Base64 encoding/decoding', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('encodes and decodes empty array', () => {
    const input = new Uint8Array([]);
    const encoded = encodeBase64(input);
    t.strictEqual(encoded, '');
    t.deepEqual(decodeBase64(encoded), input);
  });

  it('encodes and decodes simple ASCII', () => {
    const input = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const encoded = encodeBase64(input);
    t.strictEqual(encoded, 'SGVsbG8=');
    t.deepEqual(decodeBase64(encoded), input);
  });

  it('encodes and decodes binary data', () => {
    const input = new Uint8Array([0, 1, 2, 255, 254, 253]);
    const encoded = encodeBase64(input);
    t.deepEqual(decodeBase64(encoded), input);
  });

  it('decodes base64 with whitespace', () => {
    const encoded = 'SGVs bG8='; // "Hello" with space
    const decoded = decodeBase64(encoded);
    t.deepEqual(decoded, new Uint8Array([72, 101, 108, 108, 111]));
  });

  it('decodes base64 with newlines', () => {
    const encoded = 'SGVs\nbG8=';
    const decoded = decodeBase64(encoded);
    t.deepEqual(decoded, new Uint8Array([72, 101, 108, 108, 111]));
  });

  it('decodes base64 with tabs', () => {
    const encoded = 'SGVs\tbG8=';
    const decoded = decodeBase64(encoded);
    t.deepEqual(decoded, new Uint8Array([72, 101, 108, 108, 111]));
  });

  it('round-trips random data', () => {
    const input = new Uint8Array(1000);
    for (let i = 0; i < 1000; i++) {
      input[i] = Math.floor(Math.random() * 256);
    }
    const encoded = encodeBase64(input);
    const decoded = decodeBase64(encoded);
    t.deepEqual(decoded, input);
  });

  it('decodes large artwork without using an intermediate binary string', () => {
    const input = Uint8Array.from({ length: 500000 }, (_, index) => index % 256);
    const encoded = Buffer.from(input).toString('base64');
    const atob = vi.spyOn(globalThis, 'atob');
    const decoded = decodeBase64(encoded);
    t.deepEqual(decoded, input);
    t.strictEqual(Object.getPrototypeOf(decoded), Uint8Array.prototype);
    t.lengthOf(atob.mock.calls, 0);
  });

  it('passes the original input directly to the Node decoder', () => {
    const encoded = 'SGVs \n\tbG8=';
    const from = vi.spyOn(Buffer, 'from');
    t.deepEqual(decodeBase64(encoded), new Uint8Array([72, 101, 108, 108, 111]));
    expect(from).toHaveBeenCalledWith(encoded, 'base64');
  });

  it('returns a zero-copy Uint8Array view with the correct offset and length', () => {
    const backing = Buffer.alloc(20, 0xff);
    const decoded = backing.subarray(7, 10);
    decoded.set([1, 2, 3]);
    vi.spyOn(Buffer, 'from').mockReturnValueOnce(decoded);
    const result = decodeBase64('AQID');
    t.strictEqual(Object.getPrototypeOf(result), Uint8Array.prototype);
    t.strictEqual(result.buffer, decoded.buffer);
    t.strictEqual(result.byteOffset, decoded.byteOffset);
    t.strictEqual(result.byteLength, 3);
    t.deepEqual(result, new Uint8Array([1, 2, 3]));
  });

  for (const encoded of [
    '',
    'AA',
    'AB',
    'AAA',
    'AA==',
    'AAA=',
    'SGVs bG8=',
    'SGVs\nbG8=',
    'SGVs\fbG8=',
    'SGVs\vbG8=',
    'SGVs\rbG8=',
    'SGVs\u00a0bG8=',
    'SGVs \u00a0bG8='
  ]) {
    it(`keeps Node and browser decoding equivalent for ${JSON.stringify(encoded)}`, () => {
      const nodeResult = decodeBase64(encoded);
      vi.stubGlobal('Buffer', undefined);
      t.deepEqual(decodeBase64(encoded), nodeResult);
    });
  }

  it('decodes every byte value in the browser fallback', () => {
    const input = Uint8Array.from({ length: 256 }, (_, index) => index);
    const encoded = Buffer.from(input).toString('base64');
    vi.stubGlobal('Buffer', undefined);
    t.deepEqual(decodeBase64(encoded), input);
  });

  for (const encoded of ['SGVs!bG8=', '____', 'AA==AA', 'AA=AA', '=AAAA', 'AA=', 'AAA==', 'A', '\u0141A']) {
    it(`does not recover malformed browser input ${JSON.stringify(encoded)}`, () => {
      vi.stubGlobal('Buffer', undefined);
      t.throws(() => decodeBase64(encoded));
    });
  }

  it('propagates browser decoder errors without a recovery fallback', () => {
    vi.stubGlobal('Buffer', undefined);
    const error = new Error('decoder failed');
    vi.spyOn(globalThis, 'atob').mockImplementation(() => {
      throw error;
    });
    t.throws(() => decodeBase64('AQID'), error);
  });
});
