import { assert } from 'vitest';
import { decodeBase64, encodeBase64 } from '../lib/common/Base64.js';

const t = assert;

describe('Base64 encoding/decoding', () => {
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

  it('handles invalid characters leniently', () => {
    const encoded = 'SGVs!bG8='; // ! is invalid
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
});
