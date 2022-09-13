import type { Result } from "../../result/result";

/**
 * read uint8array buffer
 * @param buffer
 * @param offset
 * @param length
 * @returns uint8array
 */
export const readBuffer = (buffer: Uint8Array, offset: number, length: number): Result<Uint8Array, RangeError> => {
  if (buffer.byteLength < offset + length) return new RangeError("offset is outside the bounds of the Uint8Array");
  return buffer.subarray(offset, offset + length);
};
