import { decodeLatin1, decodeUtf16le, decodeUtf8 } from "../../compat/text-decoder";

import type { Result } from "../../result/result";

/**
 * read Latin1 (ISO-8859-1) string
 * @param buffer
 * @param offset
 * @param length
 * @returns decoded string
 */
export const readLatin1String = (buffer: Uint8Array, offset: number, length: number): Result<string, RangeError> => {
  if (buffer.byteLength < offset + length) return new RangeError("offset is outside the bounds of the Uint8Array");
  return decodeLatin1(buffer.subarray(offset, offset + length));
};

/**
 * read UTF-8 string
 * @param buffer
 * @param offset
 * @param length
 * @returns decoded string
 */
export const readUtf8String = (buffer: Uint8Array, offset: number, length: number): Result<string, RangeError> => {
  if (buffer.byteLength < offset + length) return new RangeError("offset is outside the bounds of the Uint8Array");
  return decodeUtf8(buffer.subarray(offset, offset + length));
};

/**
 * read UTF-16 Little Endian (start with 0xff 0xfe) string
 * @param buffer
 * @param offset
 * @param length
 * @returns decoded string
 */
export const readUtf16leString = (buffer: Uint8Array, offset: number, length: number): Result<string, RangeError> => {
  if (buffer.byteLength < offset + length) return new RangeError("offset is outside the bounds of the Uint8Array");
  return decodeUtf16le(buffer.subarray(offset, offset + length));
};
