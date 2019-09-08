import common from "../common/Util";
import {DataType} from "./AsfObject";
import * as Token from "token-types";

export type AttributeParser = (buf: Buffer) => boolean | string | number | Buffer;

export class AsfUtil {

  public static getParserForAttr(i: DataType): AttributeParser {
    return AsfUtil.attributeParsers[i];
  }

  public static parseUnicodeAttr(buf): string {
    return common.stripNulls(common.decodeString(buf, "utf16le"));
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

  private static parseByteArrayAttr(buf: Buffer): Buffer {
    const newBuf = Buffer.alloc(buf.length);
    buf.copy(newBuf);
    return newBuf;
  }

  private static parseBoolAttr(buf: Buffer, offset: number = 0): boolean {
    return AsfUtil.parseWordAttr(buf, offset) === 1;
  }

  private static parseDWordAttr(buf: Buffer, offset: number = 0): number {
    return buf.readUInt32LE(offset);
  }

  private static parseQWordAttr(buf: Buffer, offset: number = 0): number {
    return Token.UINT64_LE.get(buf, offset);
  }

  private static parseWordAttr(buf: Buffer, offset: number = 0): number {
    return buf.readUInt16LE(offset);
  }
}
