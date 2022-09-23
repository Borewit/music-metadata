import { Result, wrapResult } from "../../result/result";

import { dataview } from "./util";

export const FLOAT16_SIZE = 2;

/**
 * read 16 bit (half precision) floating point number big endian
 * @param buffer
 * @param offset
 * @returns float
 */
export const readFloat16be = (buffer: Uint8Array, offset: number): Result<number, RangeError> => {
  if (buffer.byteLength < offset + FLOAT16_SIZE) return new RangeError("offset is outside the bounds of the DataView");
  return getFloat16(buffer, offset);
};

/**
 * read 16 bit (half precision) floating point number little endian
 * @param buffer
 * @param offset
 * @returns float
 */
export const readFloat16le = (buffer: Uint8Array, offset: number): Result<number, RangeError> => {
  if (buffer.byteLength < offset + FLOAT16_SIZE) return new RangeError("offset is outside the bounds of the DataView");
  return getFloat16(buffer, offset, true);
};

export const FLOAT32_SIZE = 4;

/**
 * read 32 bit (single precision) floating point number big endian
 * @param buffer
 * @param offset
 * @returns float
 */
export const readFloat32be = (buffer: Uint8Array, offset: number): Result<number, RangeError> => {
  return wrapResult(() => dataview(buffer).getFloat32(offset));
};

/**
 * read 32 bit (single precision) floating point number little endian
 * @param buffer
 * @param offset
 * @returns float
 */
export const readFloat32le = (buffer: Uint8Array, offset: number): Result<number, RangeError> => {
  return wrapResult(() => dataview(buffer).getFloat32(offset, true));
};

export const FLOAT64_SIZE = 8;

/**
 * read 64 bit (single precision) floating point number big endian
 * @param buffer
 * @param offset
 * @returns float
 */
export const readFloat64be = (buffer: Uint8Array, offset: number): Result<number, RangeError> => {
  return wrapResult(() => dataview(buffer).getFloat64(offset));
};

/**
 * read 64 bit (single precision) floating point number little endian
 * @param buffer
 * @param offset
 * @returns float
 */
export const readFloat64le = (buffer: Uint8Array, offset: number): Result<number, RangeError> => {
  return wrapResult(() => dataview(buffer).getFloat64(offset, true));
};

// read functions

const getFloat16 = (buffer: Uint8Array, offset: number, littleEndian?: boolean): number => {
  /*
   * seee_eeff ffff_ffff
   * e: 5, f: 10
   * s * (2 ** e_eeee - 01111) * 1.ffffffffff
   * s * (2 ** e_eeee - 01111) * 0.ffffffffff (e == 0_0000 = 0)
   * s * Infinity                             (e == 1_1111 = 31, f == 0)
   * NaN                                      (e == 1_1111 = 31, f != 0)
   */

  const msb = buffer[(littleEndian ? 1 : 0) + offset];
  const lsb = buffer[(littleEndian ? 0 : 1) + offset];

  const sign = msb >> 7 ? -1 : 1;
  const exponent = (msb & 0b0111_1100) >> 2;
  const significant = ((msb & 0b0011) << 8) + lsb;

  if (exponent === 0) {
    return sign * significant * Math.pow(2, -24);
  }
  if (exponent === 31) {
    return significant ? Number.NaN : sign * Number.POSITIVE_INFINITY;
  }
  return sign * (significant + Math.pow(2, 10)) * Math.pow(2, exponent - 25);
};
