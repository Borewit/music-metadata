import { IRatio } from '../type';

export type StringEncoding =
  'ascii' // Use  'utf-8' or latin1 instead
  | 'utf8' // alias: 'utf-8'
  | 'utf16le' // alias: 'ucs2', 'ucs-2'
  | 'ucs2' //  'utf16le'
  | 'base64url'
  | 'latin1' // Same as ISO-8859-1 (alias: 'binary')
  | 'hex';

export interface ITextEncoding {
  encoding: StringEncoding;
  bom?: boolean;
}

export function getBit(buf: Uint8Array, off: number, bit: number): boolean {
  return (buf[off] & (1 << bit)) !== 0;
}

/**
 * Found delimiting zero in uint8Array
 * @param uint8Array Uint8Array to find the zero delimiter in
 * @param start Offset in uint8Array
 * @param end Last position to parse in uint8Array
 * @param encoding The string encoding used
 * @return Absolute position on uint8Array where zero found
 */
export function findZero(uint8Array: Uint8Array, start: number, end: number, encoding?: StringEncoding): number {
  let i = start;
  if (encoding === 'utf16le') {
    while (uint8Array[i] !== 0 || uint8Array[i + 1] !== 0) {
      if (i >= end) return end;
      i += 2;
    }
    return i;
  } else {
    while (uint8Array[i] !== 0) {
      if (i >= end) return end;
      i++;
    }
    return i;
  }
}

export function trimRightNull(x: string): string {
  const pos0 = x.indexOf('\0');
  return pos0 === -1 ? x : x.substr(0, pos0);
}

function swapBytes<T extends Uint8Array>(uint8Array: T): T {
  const l = uint8Array.length;
  if ((l & 1) !== 0) throw new Error('Buffer length must be even');
  for (let i = 0; i < l; i += 2) {
    const a = uint8Array[i];
    uint8Array[i] = uint8Array[i + 1];
    uint8Array[i + 1] = a;
  }
  return uint8Array;
}


/**
 * Decode string
 */
export function decodeString(buffer: Buffer, encoding: StringEncoding): string {
  // annoying workaround for a double BOM issue
  // https://github.com/leetreveil/musicmetadata/issues/84
  if (buffer[0] === 0xFF && buffer[1] === 0xFE) { // little endian
    return decodeString(buffer.subarray(2), encoding);
  } else if (encoding === 'utf16le' &&  buffer[0] === 0xFE && buffer[1] === 0xFF) {
    // BOM, indicating big endian decoding
    if ((buffer.length & 1) !== 0)
      throw new Error('Expected even number of octets for 16-bit unicode string');
    return decodeString(swapBytes(buffer), encoding);
  }
  return buffer.toString(encoding);
}

export function stripNulls(str: string): string {
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
export function getBitAllignedNumber(buf: Uint8Array, byteOffset: number, bitOffset: number, len: number): number {
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
    value |= getBitAllignedNumber(buf, byteOffset, bitOffset + bitsRead, bitsLeft);
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
export function isBitSet(buf: Uint8Array, byteOffset: number, bitOffset: number): boolean {
  return getBitAllignedNumber(buf, byteOffset, bitOffset, 1) === 1;
}

export function a2hex(str: string) {
  const arr = [];
  for (let i = 0, l = str.length; i < l; i++) {
    const hex = Number(str.charCodeAt(i)).toString(16);
    arr.push(hex.length === 1 ? '0' + hex : hex);
  }
  return arr.join(' ');
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
    return ps.length === 2 && ps[1] === 'db' ? {
      dB: v,
      ratio: dbToRatio(v)
    } : {
      dB: ratioToDb(v),
      ratio: v
    };
  }
}
