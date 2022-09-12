import { wrapResult } from "../../result/result";
import type { Reader } from "../types";
import { dataview } from "./util";

export const UINT8_SIZE = 1;

/**
 * read 8 bit unsigned integer
 * @param buffer
 * @param offset
 * @returns 8 bit unsigned integer
 */
export const readUint8: Reader<number> = (buffer, offset) => {
  return wrapResult(() => dataview(buffer).getUint8(offset));
};

export const UINT16_SIZE = 2;

/**
 * read 16 bit unsigned integer little endian
 * @param buffer
 * @param offset
 * @returns 16 bit unsigned integer little endian
 */
export const readUint16le: Reader<number> = (buffer, offset) => {
  return wrapResult(() => dataview(buffer).getUint16(offset, true));
};

/**
 * read 16 bit unsigned integer big endian
 * @param buffer
 * @param offset
 * @returns 16 bit unsigned integer big endian
 */
export const readUint16be: Reader<number> = (buffer, offset) => {
  return wrapResult(() => dataview(buffer).getUint16(offset));
};

export const UINT24_SIZE = 3;

/**
 * read 24 bit unsigned integer little endian
 * @param buffer
 * @param offset
 * @returns 24 bit unsigned integer little endian
 */
export const readUint24le: Reader<number> = (buffer, offset) => {
  const view = dataview(buffer);

  return wrapResult(() => view.getUint8(offset) + (view.getUint16(offset + 1, true) << 8));
};

/**
 * read 24 bit unsigned integer big endian
 * @param buffer
 * @param offset
 * @returns 24 bit unsigned integer big endian
 */
export const readUint24be: Reader<number> = (buffer, offset) => {
  const view = dataview(buffer);

  return wrapResult(() => (view.getUint16(offset) << 8) + view.getUint8(offset + 2));
};

export const UINT32_SIZE = 4;

/**
 * read 32 bit unsigned integer little endian
 * @param buffer
 * @param offset
 * @returns 32 bit unsigned integer little endian
 */
export const readUint32le: Reader<number> = (buffer, offset) => {
  return wrapResult(() => dataview(buffer).getUint32(offset, true));
};

/**
 * read 32 bit unsigned integer big endian
 * @param buffer
 * @param offset
 * @returns 32 bit unsigned integer big endian
 */
export const readUint32be: Reader<number> = (buffer, offset) => {
  return wrapResult(() => dataview(buffer).getUint32(offset));
};

export const UINT64_SIZE = 8;

/**
 * read 64 bit unsigned integer little endian
 * @param buffer
 * @param offset
 * @returns 64 bit unsigned integer little endian
 */
export const readUint64le: Reader<bigint> = (buffer, offset) => {
  return wrapResult(() => dataview(buffer).getBigUint64(offset, true));
};

/**
 * read 64 bit unsigned integer big endian
 * @param buffer
 * @param offset
 * @returns 64 bit unsigned integer big endian
 */
export const readUint64be: Reader<bigint> = (buffer, offset) => {
  return wrapResult(() => dataview(buffer).getBigUint64(offset));
};
