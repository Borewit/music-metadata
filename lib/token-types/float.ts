import { read, write } from "../ieee754";

import { dv } from "./dataview";

import type { IToken } from "./type";

/**
 * IEEE 754 16-bit (half precision) float, big endian
 */
export const Float16_BE: IToken<number> = {
  len: 2,
  get(dataView: Uint8Array, offset: number): number {
    return read(dataView, offset, false, 10, this.len);
  },
  put(dataView: Uint8Array, offset: number, value: number): number {
    write(dataView, value, offset, false, 10, this.len);
    return offset + this.len;
  },
};

/**
 * IEEE 754 16-bit (half precision) float, little endian
 */
export const Float16_LE: IToken<number> = {
  len: 2,
  get(array: Uint8Array, offset: number): number {
    return read(array, offset, true, 10, this.len);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    write(array, value, offset, true, 10, this.len);
    return offset + this.len;
  },
};

/**
 * IEEE 754 32-bit (single precision) float, big endian
 */
export const Float32_BE: IToken<number> = {
  len: 4,
  get(array: Uint8Array, offset: number): number {
    return dv(array).getFloat32(offset);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setFloat32(offset, value);
    return offset + 4;
  },
};

/**
 * IEEE 754 32-bit (single precision) float, little endian
 */
export const Float32_LE: IToken<number> = {
  len: 4,
  get(array: Uint8Array, offset: number): number {
    return dv(array).getFloat32(offset, true);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setFloat32(offset, value, true);
    return offset + 4;
  },
};

/**
 * IEEE 754 64-bit (double precision) float, big endian
 */
export const Float64_BE: IToken<number> = {
  len: 8,
  get(array: Uint8Array, offset: number): number {
    return dv(array).getFloat64(offset);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setFloat64(offset, value);
    return offset + 8;
  },
};

/**
 * IEEE 754 64-bit (double precision) float, little endian
 */
export const Float64_LE: IToken<number> = {
  len: 8,
  get(array: Uint8Array, offset: number): number {
    return dv(array).getFloat64(offset, true);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setFloat64(offset, value, true);
    return offset + 8;
  },
};

/**
 * IEEE 754 80-bit (extended precision) float, big endian
 */
export const Float80_BE: IToken<number> = {
  len: 10,
  get(array: Uint8Array, offset: number): number {
    return read(array, offset, false, 63, this.len);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    write(array, value, offset, false, 63, this.len);
    return offset + this.len;
  },
};

/**
 * IEEE 754 80-bit (extended precision) float, little endian
 */
export const Float80_LE: IToken<number> = {
  len: 10,
  get(array: Uint8Array, offset: number): number {
    return read(array, offset, true, 63, this.len);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    write(array, value, offset, true, 63, this.len);
    return offset + this.len;
  },
};
