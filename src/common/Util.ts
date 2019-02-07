import * as assert from "assert";
import {Windows1292Decoder} from './Windows1292Decoder';
import {IRatio} from "../type";

export type StringEncoding = 'iso-8859-1' | 'utf16' | 'utf8' | 'utf8' | 'utf16le';

export default class Util {

  public static strtokBITSET = {
    get: (buf: Buffer, off: number, bit: number): boolean => {
      return (buf[off] & (1 << bit)) !== 0;
    },
    len: 1
  };

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

  public static trimRightNull(x: string): string {
    const pos0 = x.indexOf('\0');
    return pos0 === -1 ? x : x.substr(0, pos0);
  }

  public static swapBytes(buffer: Buffer): Buffer {
    const l = buffer.length;
    assert.ok((l & 1) === 0, 'Buffer length must be even');
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
      buffer = Util.swapBytes(buffer);
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
  public static decodeString(buffer: Buffer, encoding: StringEncoding): string {
    // annoying workaround for a double BOM issue
    // https://github.com/leetreveil/musicmetadata/issues/84
    if (buffer[0] === 0xFF && buffer[1] === 0xFE && buffer[2] === 0xFE && buffer[3] === 0xFF) {
      buffer = buffer.slice(2);
    }

    if (encoding === 'utf16le' || encoding === 'utf16') {
      return Util.readUTF16String(buffer);
    } else if (encoding === 'utf8') {
      return buffer.toString('utf8');
    } else if (encoding === 'iso-8859-1') {
      return Windows1292Decoder.decode(buffer);
    }

    throw Error(encoding + ' encoding is not supported!');
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
      value |= Util.getBitAllignedNumber(buf, byteOffset, bitOffset + bitsRead, bitsLeft);
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
    return Util.getBitAllignedNumber(buf, byteOffset, bitOffset, 1) === 1;
  }

  public static a2hex(str: string) {
    const arr = [];
    for (let i = 0, l = str.length; i < l; i ++) {
      const hex = Number(str.charCodeAt(i)).toString(16);
      arr.push(hex.length === 1 ? '0' + hex : hex);
    }
    return arr.join(' ');
  }

}

/**
 * Convert power ratio to DB
 * ratio: [0..1]
 */
export function ratioToDb(ratio: number): number {
  return 10 * Math.log10(ratio);
}

/**
 * Convert dB to ratio
 * db Decibels
 */
export function dbToRatio(dB: number): number {
  return Math.pow(10, dB / 10);
}

/**
 * Convert replay gain to ratio and Decibel
 * @param value string holding a ratio like '0.034' or '-7.54 dB'
 */
export function toRatio(value: string): IRatio {
  const ps = value.split(' ').map(p => p.trim().toLowerCase());
  // @ts-ignore
  if (ps.length >= 1) {
    const v = parseFloat(ps[0]);
    if (ps.length === 2 && ps[1] === 'db') {
      return {
        dB: v,
        ratio: dbToRatio(v)
      };
    } else {
      return {
        dB: ratioToDb(v),
        ratio: v
      };
    }
  }
}
