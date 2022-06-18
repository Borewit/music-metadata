import { IToken } from "./type";
import { dv } from "./dataview";
import { UINT24_BE, UINT24_LE } from "./uint";

/**
 * 8-bit signed integer
 */
export const INT8: IToken<number> = {
  len: 1,

  get(array: Uint8Array, offset: number): number {
    return dv(array).getInt8(offset);
  },

  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setInt8(offset, value);
    return offset + 2;
  },
};

/**
 * 16-bit signed integer, Big Endian byte order
 */
export const INT16_BE: IToken<number> = {
  len: 2,
  get(array: Uint8Array, offset: number): number {
    return dv(array).getInt16(offset);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setInt16(offset, value);
    return offset + 2;
  },
};

/**
 * 16-bit signed integer, Little Endian byte order
 */
export const INT16_LE: IToken<number> = {
  len: 2,
  get(array: Uint8Array, offset: number): number {
    return dv(array).getInt16(offset, true);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setInt16(offset, value, true);
    return offset + 2;
  },
};

/**
 * 24-bit signed integer, Little Endian byte order
 */
export const INT24_LE: IToken<number> = {
  len: 3,
  get(array: Uint8Array, offset: number): number {
    const unsigned = UINT24_LE.get(array, offset);
    return unsigned > 0x7f_ff_ff ? unsigned - 0x1_00_00_00 : unsigned;
  },
  put(array: Uint8Array, offset: number, value: number): number {
    const dataView = dv(array);
    dataView.setUint8(offset, value & 0xff);
    dataView.setUint16(offset + 1, value >> 8, true);
    return offset + 3;
  },
};

/**
 * 24-bit signed integer, Big Endian byte order
 */
export const INT24_BE: IToken<number> = {
  len: 3,
  get(array: Uint8Array, offset: number): number {
    const unsigned = UINT24_BE.get(array, offset);
    return unsigned > 0x7f_ff_ff ? unsigned - 0x1_00_00_00 : unsigned;
  },
  put(array: Uint8Array, offset: number, value: number): number {
    const dataView = dv(array);
    dataView.setUint16(offset, value >> 8);
    dataView.setUint8(offset + 2, value & 0xff);
    return offset + 3;
  },
};

/**
 * 32-bit signed integer, Big Endian byte order
 */
export const INT32_BE: IToken<number> = {
  len: 4,
  get(array: Uint8Array, offset: number): number {
    return dv(array).getInt32(offset);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setInt32(offset, value);
    return offset + 4;
  },
};

/**
 * 32-bit signed integer, Big Endian byte order
 */
export const INT32_LE: IToken<number> = {
  len: 4,
  get(array: Uint8Array, offset: number): number {
    return dv(array).getInt32(offset, true);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setInt32(offset, value, true);
    return offset + 4;
  },
};

/**
 * 64-bit signed integer, Little Endian byte order
 */
export const INT64_LE: IToken<bigint> = {
  len: 8,
  get(array: Uint8Array, offset: number): bigint {
    return dv(array).getBigInt64(offset, true);
  },
  put(array: Uint8Array, offset: number, value: bigint): number {
    dv(array).setBigInt64(offset, value, true);
    return offset + 8;
  },
};

/**
 * 64-bit signed integer, Big Endian byte order
 */
export const INT64_BE: IToken<bigint> = {
  len: 8,
  get(array: Uint8Array, offset: number): bigint {
    return dv(array).getBigInt64(offset);
  },
  put(array: Uint8Array, offset: number, value: bigint): number {
    dv(array).setBigInt64(offset, value);
    return offset + 8;
  },
};
