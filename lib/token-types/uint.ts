import { IToken } from "./type";
import { dv } from "./dataview";

/**
 * 8-bit unsigned integer
 */
export const UINT8: IToken<number> = {
  len: 1,

  get(array: Uint8Array, offset: number): number {
    return dv(array).getUint8(offset);
  },

  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setUint8(offset, value);
    return offset + 1;
  },
};

/**
 * 16-bit unsigned integer, Little Endian byte order
 */
export const UINT16_LE: IToken<number> = {
  len: 2,

  get(array: Uint8Array, offset: number): number {
    return dv(array).getUint16(offset, true);
  },

  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setUint16(offset, value, true);
    return offset + 2;
  },
};

/**
 * 16-bit unsigned integer, Big Endian byte order
 */
export const UINT16_BE: IToken<number> = {
  len: 2,

  get(array: Uint8Array, offset: number): number {
    return dv(array).getUint16(offset);
  },

  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setUint16(offset, value);
    return offset + 2;
  },
};

/**
 * 24-bit unsigned integer, Little Endian byte order
 */
export const UINT24_LE: IToken<number> = {
  len: 3,
  get(array: Uint8Array, offset: number): number {
    const dataView = dv(array);
    return dataView.getUint8(offset) + (dataView.getUint16(offset + 1, true) << 8);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    const dataView = dv(array);
    dataView.setUint8(offset, value & 0xff);
    dataView.setUint16(offset + 1, value >> 8, true);
    return offset + 3;
  },
};

/**
 * 24-bit unsigned integer, Big Endian byte order
 */
export const UINT24_BE: IToken<number> = {
  len: 3,
  get(array: Uint8Array, offset: number): number {
    const dataView = dv(array);
    return (dataView.getUint16(offset) << 8) + dataView.getUint8(offset + 2);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    const dataView = dv(array);
    dataView.setUint16(offset, value >> 8);
    dataView.setUint8(offset + 2, value & 0xff);
    return offset + 3;
  },
};

/**
 * 32-bit unsigned integer, Little Endian byte order
 */
export const UINT32_LE: IToken<number> = {
  len: 4,

  get(array: Uint8Array, offset: number): number {
    return dv(array).getUint32(offset, true);
  },

  put(array: Uint8Array, offset: number, value: number) {
    dv(array).setUint32(offset, value, true);
    return offset + 4;
  },
};

/**
 * 32-bit unsigned integer, Big Endian byte order
 */
export const UINT32_BE: IToken<number> = {
  len: 4,

  get(array: Uint8Array, offset: number): number {
    return dv(array).getUint32(offset);
  },

  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setUint32(offset, value);
    return offset + 4;
  },
};

/**
 * 64-bit unsigned integer, Little Endian byte order
 */
export const UINT64_LE: IToken<bigint> = {
  len: 8,
  get(array: Uint8Array, offset: number): bigint {
    return dv(array).getBigUint64(offset, true);
  },
  put(array: Uint8Array, offset: number, value: bigint): number {
    dv(array).setBigUint64(offset, value, true);
    return offset + 8;
  },
};

/**
 * 64-bit unsigned integer, Big Endian byte order
 */
export const UINT64_BE: IToken<bigint> = {
  len: 8,
  get(array: Uint8Array, offset: number): bigint {
    return dv(array).getBigUint64(offset);
  },
  put(array: Uint8Array, offset: number, value: bigint): number {
    dv(array).setBigUint64(offset, value);
    return offset + 8;
  },
};
