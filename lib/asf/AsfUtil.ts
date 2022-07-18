import * as Token from "../token-types";

import * as util from "../common/Util";
import { DataType } from "./DataType";

export type AttributeParser = (buf: Uint8Array) => boolean | string | number | bigint | Uint8Array;

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
export function parseByteArrayAttr(buf: Uint8Array): Uint8Array {
  return buf;
}

/**
 *
 * @param buf
 * @param offset
 * @returns
 */
export function parseBoolAttr(buf: Uint8Array, offset = 0): boolean {
  return parseWordAttr(buf, offset) === 1;
}

/**
 *
 * @param buf
 * @param offset
 * @returns
 */
export function parseDWordAttr(buf: Uint8Array, offset = 0): number {
  return Token.UINT32_LE.get(buf, offset);
}

/**
 *
 * @param buf
 * @param offset
 * @returns
 */
export function parseQWordAttr(buf: Uint8Array, offset = 0): bigint {
  return Token.UINT64_LE.get(buf, offset);
}

/**
 *
 * @param buf
 * @param offset
 * @returns
 */
export function parseWordAttr(buf: Uint8Array, offset = 0): number {
  return Token.UINT16_LE.get(buf, offset);
}
