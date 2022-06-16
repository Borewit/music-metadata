import * as Token from "../token-types";

import * as util from "../common/Util";
import { DataType } from "./DataType";

export type AttributeParser = (
  buf: Buffer
) => boolean | string | number | bigint | Buffer;

/**
 *
 * @param i
 * @returns
 */
export function getParserForAttr(i: DataType): AttributeParser {
  return attributeParsers[i];
}

/**
 *
 * @param uint8Array
 * @returns
 */
export function parseUnicodeAttr(uint8Array: Uint8Array): string {
  return util.stripNulls(util.decodeString(uint8Array, "utf16le"));
}

export const attributeParsers: AttributeParser[] = [
  parseUnicodeAttr,
  parseByteArrayAttr,
  parseBoolAttr,
  parseDWordAttr,
  parseQWordAttr,
  parseWordAttr,
  parseByteArrayAttr,
];

/**
 *
 * @param buf
 * @returns
 */
export function parseByteArrayAttr(buf: Uint8Array): Buffer {
  return Buffer.from(buf);
}

/**
 *
 * @param buf
 * @param offset
 * @returns
 */
export function parseBoolAttr(buf: Buffer, offset: number = 0): boolean {
  return parseWordAttr(buf, offset) === 1;
}

/**
 *
 * @param buf
 * @param offset
 * @returns
 */
export function parseDWordAttr(buf: Buffer, offset: number = 0): number {
  return buf.readUInt32LE(offset);
}

/**
 *
 * @param buf
 * @param offset
 * @returns
 */
export function parseQWordAttr(buf: Buffer, offset: number = 0): bigint {
  return Token.UINT64_LE.get(buf, offset);
}

/**
 *
 * @param buf
 * @param offset
 * @returns
 */
export function parseWordAttr(buf: Buffer, offset: number = 0): number {
  return buf.readUInt16LE(offset);
}
