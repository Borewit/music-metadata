import common from '../common';

export type AttributeParser = (buf: Buffer) => boolean | string | number | Buffer;

export class Util {

  public static getParserForAttr(i: number): AttributeParser {
    return Util.attributeParsers[i];
  }

  public static parseUnicodeAttr(buf): string {
    return common.stripNulls(common.decodeString(buf, 'utf16le'));
  }

  public static parseByteArrayAttr(buf: Buffer): Buffer {
    const newBuf = new Buffer(buf.length);
    buf.copy(newBuf);
    return newBuf;
  }

  public static parseBoolAttr(buf: Buffer): boolean {
    return Util.parseWordAttr(buf) === 1;
  }

  public static parseDWordAttr(buf: Buffer, offset: number = 0): number {
    return buf.readUInt32LE(offset);
  }

  public static parseQWordAttr(buf: Buffer, offset: number = 0): number {
    return Util.readUInt64LE(buf, offset);
  }

  public static parseWordAttr(buf: Buffer, offset: number = 0): number {
    return buf.readUInt16LE(offset);
  }

  public static readUInt64LE(buffer: Buffer, offset: number): number {
    const high = buffer.slice(offset, offset + 4).readUInt32LE(0);
    const low = buffer.slice(offset + 4, offset + 8).readUInt32LE(0);
    const maxuint32 = Math.pow(2, 32);
    return ((low * maxuint32) + (high >>> 0));
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
}
