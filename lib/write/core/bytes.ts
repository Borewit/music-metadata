import { textDecode, textEncode } from '@borewit/text-codec';
import { UINT8, UINT16_BE, UINT24_BE, UINT32_BE, UINT32_LE, UINT64_BE } from 'token-types';

import { InvalidFileError } from './errors.js';

export function readUInt8(data: Uint8Array, offset: number): number {
  ensureAvailable(data, offset, 1);
  return UINT8.get(data, offset);
}

export function readUInt16BE(data: Uint8Array, offset: number): number {
  ensureAvailable(data, offset, 2);
  return UINT16_BE.get(data, offset);
}

export function readUInt24BE(data: Uint8Array, offset: number): number {
  ensureAvailable(data, offset, 3);
  return UINT24_BE.get(data, offset);
}

export function readUInt32BE(data: Uint8Array, offset: number): number {
  ensureAvailable(data, offset, 4);
  return UINT32_BE.get(data, offset);
}

export function readUInt32LE(data: Uint8Array, offset: number): number {
  ensureAvailable(data, offset, 4);
  return UINT32_LE.get(data, offset);
}

export function readUInt64BE(data: Uint8Array, offset: number): bigint {
  ensureAvailable(data, offset, 8);
  return UINT64_BE.get(data, offset);
}

export function readBytes(data: Uint8Array, offset: number, length: number): Uint8Array {
  ensureAvailable(data, offset, length);
  return data.subarray(offset, offset + length);
}

export function decodeUtf8(data: Uint8Array): string {
  return textDecode(data, 'utf-8');
}

/** Decode bytes as ISO-8859-1, preserving one character per byte. */
export function decodeAscii(data: Uint8Array): string {
  return textDecode(data, 'latin1');
}

export function encodeUtf8(value: string): Uint8Array {
  return textEncode(value, 'utf-8');
}

export function concatBytes(...chunks: readonly Uint8Array[]): Uint8Array {
  let length = 0;
  for (const chunk of chunks) {
    length += chunk.length;
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export function ensureAvailable(data: Uint8Array, offset: number, length: number): void {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0) {
    throw new InvalidFileError(`Invalid read range: offset=${offset}, length=${length}`);
  }
  if (offset + length > data.length) {
    throw new InvalidFileError(
      `Unexpected end of data: need ${length} byte(s) at offset ${offset}, but only ${data.length - offset} available`
    );
  }
}
