import * as Token from 'token-types';

import * as util from '../common/Util.js';
import { DataType } from './AsfObject.js';

export type AttributeParser = (buf: Uint8Array) => boolean | string | number | bigint | Uint8Array;

export class AsfUtil {

  public static getParserForAttr(i: DataType): AttributeParser {
    return AsfUtil.attributeParsers[i];
  }

  public static parseUnicodeAttr(uint8Array: Uint8Array): string {
    return util.stripNulls(util.decodeString(uint8Array, 'utf-16le'));
  }

  private static attributeParsers: AttributeParser[] = [
    AsfUtil.parseUnicodeAttr,
    AsfUtil.parseByteArrayAttr,
    AsfUtil.parseBoolAttr,
    AsfUtil.parseDWordAttr,
    AsfUtil.parseQWordAttr,
    AsfUtil.parseWordAttr,
    AsfUtil.parseByteArrayAttr
  ];

  private static parseByteArrayAttr(buf: Uint8Array): Uint8Array {
    return new Uint8Array(buf);
  }

  private static parseBoolAttr(buf: Uint8Array, offset: number = 0): boolean {
    return AsfUtil.parseWordAttr(buf, offset) === 1;
  }

  private static parseDWordAttr(buf: Uint8Array, offset: number = 0): number {
    return Token.UINT32_LE.get(buf, offset);
  }

  private static parseQWordAttr(buf: Uint8Array, offset: number = 0): bigint {
    return Token.UINT64_LE.get(buf, offset);
  }

  private static parseWordAttr(buf: Uint8Array, offset: number = 0): number {
    return Token.UINT16_LE.get(buf, offset);
  }
}
