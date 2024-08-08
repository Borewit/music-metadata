import * as Token from 'token-types';

import * as util from '../common/Util.js';
import type { DataType } from './AsfObject.js';

export type AttributeParser = (buf: Uint8Array) => boolean | string | number | bigint | Uint8Array;

export function getParserForAttr(i: DataType): AttributeParser {
  return attributeParsers[i];
}

export function parseUnicodeAttr(uint8Array: Uint8Array): string {
  return util.stripNulls(util.decodeString(uint8Array, 'utf-16le'));
}

const attributeParsers: AttributeParser[] = [
  parseUnicodeAttr,
  parseByteArrayAttr,
  parseBoolAttr,
  parseDWordAttr,
  parseQWordAttr,
  parseWordAttr,
  parseByteArrayAttr
];

function parseByteArrayAttr(buf: Uint8Array): Uint8Array {
    return new Uint8Array(buf);
  }

function parseBoolAttr(buf: Uint8Array, offset = 0): boolean {
  return parseWordAttr(buf, offset) === 1;
}

function parseDWordAttr(buf: Uint8Array, offset = 0): number {
  return Token.UINT32_LE.get(buf, offset);
}

function parseQWordAttr(buf: Uint8Array, offset = 0): bigint {
  return Token.UINT64_LE.get(buf, offset);
}

function parseWordAttr(buf: Uint8Array, offset = 0): number {
  return Token.UINT16_LE.get(buf, offset);
}

