import * as Token from 'token-types';
import { concatBytes } from '../core/bytes.js';
import { InvalidFileError, InvalidPatchError, UnsupportedFeatureError } from '../core/errors.js';

export interface Box {
  type: string;
  start: number;
  end: number;
  header: number;
}
export const limit = 64 * 1024 * 1024;
export const maxAtoms = 100_000;
export interface AtomBudget {
  remaining: number;
}
export const fourcc = (bytes: Uint8Array, offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
const u32 = (n: number) => {
  const b = new Uint8Array(4);
  Token.UINT32_BE.put(b, 0, n);
  return b;
};
export const zeros = new Uint8Array(4);
export function atom(type: string, ...parts: Uint8Array[]): Uint8Array {
  if (parts.reduce((sum, part) => sum + part.length, 8) > limit) {
    throw new UnsupportedFeatureError('MP4 metadata atom exceeds 64 MiB');
  }
  const body = concatBytes(...parts);
  if (type.length !== 4 || body.length > 0xfffffff7) {
    throw new InvalidPatchError('Invalid MP4 atom');
  }
  return concatBytes(
    u32(body.length + 8),
    Uint8Array.from(type, c => c.charCodeAt(0)),
    body
  );
}
export function header(bytes: Uint8Array, start: number, end: number): Box {
  if (end - start < 8) {
    throw new InvalidFileError('Truncated MP4 atom header');
  }
  let size = Token.UINT32_BE.get(bytes, start);
  let length = 8;
  if (size === 1) {
    if (end - start < 16) {
      throw new InvalidFileError('Truncated MP4 extended size');
    }
    const big = Token.UINT64_BE.get(bytes, start + 8);
    if (big > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new InvalidFileError('MP4 atom exceeds safe offset range');
    }
    size = Number(big);
    length = 16;
  } else if (size === 0) {
    size = end - start;
  }
  if (size < length || size > end - start) {
    throw new InvalidFileError('Invalid MP4 atom size');
  }
  return { type: fourcc(bytes, start + 4), start, end: start + size, header: length };
}
export function boxes(
  bytes: Uint8Array,
  start = 0,
  end = bytes.length,
  budget: AtomBudget = { remaining: maxAtoms }
): Box[] {
  const result: Box[] = [];
  while (start < end) {
    if (--budget.remaining < 0) {
      throw new UnsupportedFeatureError('MP4 atom count exceeds limit');
    }
    const box = header(bytes, start, end);
    result.push(box);
    start = box.end;
  }
  return result;
}
export function copyBox(bytes: Uint8Array, box: Box): Uint8Array {
  // A size-to-end child must not swallow siblings appended during an edit.
  return Token.UINT32_BE.get(bytes, box.start) === 0
    ? atom(box.type, bytes.subarray(box.start + box.header, box.end))
    : bytes.subarray(box.start, box.end);
}
