import common from "../common/Util";
import {DataType} from "./AsfObject";

export type AttributeParser = (buf: Buffer) => boolean | string | number | Buffer;

export class Util {

  public static getParserForAttr(i: DataType): AttributeParser {
    return Util.attributeParsers[i];
  }

  public static parseUnicodeAttr(buf): string {
    return common.stripNulls(common.decodeString(buf, "utf16le"));
  }

  /**
   * Best effort approach to read 64 but unsigned integer.
   * Note that JavasScript is limited to 2^53 - 1 bit.
   */
  public static readUInt64LE(buf: Buffer, offset: number = 0): number {
    let n = buf[offset];
    let mul = 1;
    let i = 0;
    while (++i < 8 && (mul *= 0x100)) {
      n += buf[offset + i] * mul
    }
    return n;
  }

  private static attributeParsers: AttributeParser[] = [
    Util.parseUnicodeAttr,
    Util.parseByteArrayAttr,
    Util.parseBoolAttr,
    Util.parseDWordAttr,
    Util.parseQWordAttr,
    Util.parseWordAttr,
    Util.parseByteArrayAttr
  ];

  private static parseByteArrayAttr(buf: Buffer): Buffer {
    const newBuf = Buffer.alloc(buf.length);
    buf.copy(newBuf);
    return newBuf;
  }

  private static parseBoolAttr(buf: Buffer, offset: number = 0): boolean {
    return Util.parseWordAttr(buf, offset) === 1;
  }

  private static parseDWordAttr(buf: Buffer, offset: number = 0): number {
    return buf.readUInt32LE(offset);
  }

  private static parseQWordAttr(buf: Buffer, offset: number = 0): number {
    return Util.readUInt64LE(buf, offset);
  }

  private static parseWordAttr(buf: Buffer, offset: number = 0): number {
    return buf.readUInt16LE(offset);
  }
}
