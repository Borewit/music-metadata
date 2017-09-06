import common from '../common';
import {DataType} from "./AsfObject";

export type AttributeParser = (buf: Buffer) => boolean | string | number | Buffer;

export class Util {

  public static getParserForAttr(i: DataType): AttributeParser {
    return Util.attributeParsers[i];
  }

  public static readUInt64LE(buffer: Buffer, offset: number): number {
    const high = buffer.slice(offset, offset + 4).readUInt32LE(0);
    const low = buffer.slice(offset + 4, offset + 8).readUInt32LE(0);
    const maxuint32 = Math.pow(2, 32);
    return ((low * maxuint32) + (high >>> 0));
  }

  public static parseUnicodeAttr(buf): string {
    return common.stripNulls(common.decodeString(buf, 'utf16le'));
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
    const newBuf = new Buffer(buf.length);
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
