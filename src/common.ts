import {Windows1292Decoder} from './Windows1292Decoder';
import {Genres} from "./id3v1/ID3v1Parser";

export type encoding = 'iso-8859-1' | 'utf16' | 'utf8' | 'utf8'| 'utf16le';

export default class Common {

  public static strtokUINT24_BE = {
    get: (buf: Buffer, off: number): number => {
      return (((buf[off] << 8) + buf[off + 1]) << 8) + buf[off + 2];
    },
    len: 3
  };

  public static strtokBITSET = {
    get: (buf: Buffer, off: number, bit: number): boolean => {
      return (buf[off] & (1 << bit)) !== 0;
    },
    len: 1
  };

  public static strtokUINT32_LE = {
    len: 4,
    get: (buf: Buffer, off: number) => {
      // Shifting the MSB by 24 directly causes it to go negative if its
      // last bit is high, so we instead shift by 23 and multiply by 2.
      // Also, using binary OR to count the MSB if its last bit is high
      // causes the value to go negative. Use addition there.
      return (buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16)) +
        ((buf[off + 3] << 23) * 2);
    }
  };

  public static getParserForMediaType(types, header) {
    for (const type of types) {
      const offset = type.offset || 0;
      if (header.length >= offset + type.buf.length && header.slice(offset, offset + type.buf.length).compare(type.buf) === 0) {
        return type.tag;
      }
    }
    // default to id3v1.1 if we cannot detect any other tags
    return require('./id3v1/id3v1');
  }

  public static streamOnRealEnd(stream: NodeJS.ReadableStream, callback: () => void): void {
    stream.on('end', done);
    stream.on('close', done);
    function done() {
      stream.removeListener('end', done);
      stream.removeListener('close', done);
      callback();
    }
  }

  public static removeUnsyncBytes(buffer: Buffer): Buffer {
    let readI = 0;
    let writeI = 0;
    while (readI < buffer.length - 1) {
      if (readI !== writeI) {
        buffer[writeI] = buffer[readI];
      }
      readI += (buffer[readI] === 0xFF && buffer[readI + 1] === 0) ? 2 : 1;
      writeI++;
    }
    if (readI < buffer.length) {
      buffer[writeI++] = buffer[readI++];
    }
    return buffer.slice(0, writeI);
  }

  /**
   *
   * @param buffer
   * @param start
   * @param end
   * @param encoding // ToDo: ts.enum
   * @return {number}
   */
  public static findZero(buffer: Buffer, start: number, end: number, encoding?: string): number {
    let i = start;
    if (encoding === 'utf16') {
      while (buffer[i] !== 0 || buffer[i + 1] !== 0) {
        if (i >= end) return end;
        i += 2;
      }
      return i;
    } else {
      while (buffer[i] !== 0) {
        if (i >= end) return end;
        i++;
      }
      return i;
    }
  }

  public static sum(arr: number[]): number {
    let s: number = 0;
    for (const v of arr) {
      s += v;
    }
    return s;
  }

  public static swapBytes(buffer: Buffer): Buffer {
    const l = buffer.length;
    if (l & 0x01) {
      throw new Error('Buffer length must be even');
    }
    for (let i = 0; i < l; i += 2) {
      const a = buffer[i];
      buffer[i] = buffer[i + 1];
      buffer[i + 1] = a;
    }
    return buffer;
  }

  public static readUTF16String(buffer: Buffer): string {
    let offset = 0;
    if (buffer[0] === 0xFE && buffer[1] === 0xFF) { // big endian
      buffer = Common.swapBytes(buffer);
      offset = 2;
    } else if (buffer[0] === 0xFF && buffer[1] === 0xFE) { // little endian
      offset = 2;
    }
    return buffer.toString('ucs2', offset);
  }

  /**
   *
   * @param buffer Decoder input data
   * @param encoding 'utf16le' | 'utf16' | 'utf8' | 'iso-8859-1'
   * @return {string}
   */
  public static decodeString(buffer: Buffer, encoding: encoding): string {
    // annoying workaround for a double BOM issue
    // https://github.com/leetreveil/musicmetadata/issues/84
    if (buffer[0] === 0xFF && buffer[1] === 0xFE && buffer[2] === 0xFE && buffer[3] === 0xFF) {
      buffer = buffer.slice(2);
    }

    if (encoding === 'utf16le' || encoding === 'utf16') {
      return Common.readUTF16String(buffer);
    } else if (encoding === 'utf8') {
      return buffer.toString('utf8');
    } else if (encoding === 'iso-8859-1') {
      return Windows1292Decoder.decode(buffer);
    }

    throw Error(encoding + ' encoding is not supported!');
  }

  public static parseGenre(origVal: string) {
    // match everything inside parentheses
    const split = origVal.trim().split(/\((.*?)\)/g).filter( (val) => {
        return val !== '';
      });

    const array = [];
    for (let cur of split) {
      if (/^\d+$/.test(cur) && !isNaN(parseInt(cur, 10))) {
        cur = Genres[cur];
      }
      array.push(cur);
    }

    return array
      .filter( (val) => {
        return val !== undefined;
      }).join('/');
  }

  public static stripNulls(str: string): string {
    str = str.replace(/^\x00+/g, '');
    str = str.replace(/\x00+$/g, '');
    return str;
  }

  /**
   * Read bit-aligned number start from buffer
   * Total offset in bits = byteOffset * 8 + bitOffset
   * @param buf Byte buffer
   * @param byteOffset Starting offset in bytes
   * @param bitOffset Starting offset in bits: 0 = lsb
   * @param len Length of number in bits
   * @return {number} decoded bit aligned number
   */
  public static getBitAllignedNumber(buf: Buffer, byteOffset: number, bitOffset: number, len: number): number {
    const byteOff = byteOffset + ~~(bitOffset / 8);
    const bitOff = bitOffset % 8;
    let value = buf[byteOff];
    value &= 0xff >> bitOff;
    const bitsRead = 8 - bitOff;
    const bitsLeft = len - bitsRead;
    if (bitsLeft < 0) {
      value >>= (8 - bitOff - len);
    } else if (bitsLeft > 0) {
      value <<= bitsLeft;
      value |= Common.getBitAllignedNumber(buf, byteOffset, bitOffset + bitsRead, bitsLeft);
    }
    return value;
  }

  /**
   * Read bit-aligned number start from buffer
   * Total offset in bits = byteOffset * 8 + bitOffset
   * @param buf Byte buffer
   * @param byteOffset Starting offset in bytes
   * @param bitOffset Starting offset in bits: 0 = most significant bit, 7 is least significant bit
   * @return {number} decoded bit aligned number
   */
  public static isBitSet(buf: Buffer, byteOffset: number, bitOffset: number): boolean {
    return Common.getBitAllignedNumber(buf, byteOffset, bitOffset, 1) === 1;
  }
}
