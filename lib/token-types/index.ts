import * as ieee754 from "ieee754";
import { IToken, IGetToken } from "../@tokenizer/token";

// Primitive types

function dv(array: Uint8Array) {
  return new DataView(array.buffer, array.byteOffset);
}

/**
 * 8-bit unsigned integer
 */
export const UINT8: IToken<number> = {
  len: 1,

  get(array: Uint8Array, offset: number): number {
    return dv(array).getUint8(offset);
  },

  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setUint8(offset, value);
    return offset + 1;
  },
};

/**
 * 16-bit unsigned integer, Little Endian byte order
 */
export const UINT16_LE: IToken<number> = {
  len: 2,

  get(array: Uint8Array, offset: number): number {
    return dv(array).getUint16(offset, true);
  },

  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setUint16(offset, value, true);
    return offset + 2;
  },
};

/**
 * 16-bit unsigned integer, Big Endian byte order
 */
export const UINT16_BE: IToken<number> = {
  len: 2,

  get(array: Uint8Array, offset: number): number {
    return dv(array).getUint16(offset);
  },

  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setUint16(offset, value);
    return offset + 2;
  },
};

/**
 * 24-bit unsigned integer, Little Endian byte order
 */
export const UINT24_LE: IToken<number> = {
  len: 3,
  get(array: Uint8Array, offset: number): number {
    const dataView = dv(array);
    return (
      dataView.getUint8(offset) + (dataView.getUint16(offset + 1, true) << 8)
    );
  },
  put(array: Uint8Array, offset: number, value: number): number {
    const dataView = dv(array);
    dataView.setUint8(offset, value & 0xff);
    dataView.setUint16(offset + 1, value >> 8, true);
    return offset + 3;
  },
};

/**
 * 24-bit unsigned integer, Big Endian byte order
 */
export const UINT24_BE: IToken<number> = {
  len: 3,
  get(array: Uint8Array, offset: number): number {
    const dataView = dv(array);
    return (dataView.getUint16(offset) << 8) + dataView.getUint8(offset + 2);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    const dataView = dv(array);
    dataView.setUint16(offset, value >> 8);
    dataView.setUint8(offset + 2, value & 0xff);
    return offset + 3;
  },
};

/**
 * 32-bit unsigned integer, Little Endian byte order
 */
export const UINT32_LE: IToken<number> = {
  len: 4,

  get(array: Uint8Array, offset: number): number {
    return dv(array).getUint32(offset, true);
  },

  put(array: Uint8Array, offset: number, value: number) {
    dv(array).setUint32(offset, value, true);
    return offset + 4;
  },
};

/**
 * 32-bit unsigned integer, Big Endian byte order
 */
export const UINT32_BE: IToken<number> = {
  len: 4,

  get(array: Uint8Array, offset: number): number {
    return dv(array).getUint32(offset);
  },

  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setUint32(offset, value);
    return offset + 4;
  },
};

/**
 * 8-bit signed integer
 */
export const INT8: IToken<number> = {
  len: 1,

  get(array: Uint8Array, offset: number): number {
    return dv(array).getInt8(offset);
  },

  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setInt8(offset, value);
    return offset + 2;
  },
};

/**
 * 16-bit signed integer, Big Endian byte order
 */
export const INT16_BE: IToken<number> = {
  len: 2,
  get(array: Uint8Array, offset: number): number {
    return dv(array).getInt16(offset);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setInt16(offset, value);
    return offset + 2;
  },
};

/**
 * 16-bit signed integer, Little Endian byte order
 */
export const INT16_LE: IToken<number> = {
  len: 2,
  get(array: Uint8Array, offset: number): number {
    return dv(array).getInt16(offset, true);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setInt16(offset, value, true);
    return offset + 2;
  },
};

/**
 * 24-bit signed integer, Little Endian byte order
 */
export const INT24_LE: IToken<number> = {
  len: 3,
  get(array: Uint8Array, offset: number): number {
    const unsigned = UINT24_LE.get(array, offset);
    return unsigned > 0x7fffff ? unsigned - 0x1000000 : unsigned;
  },
  put(array: Uint8Array, offset: number, value: number): number {
    const dataView = dv(array);
    dataView.setUint8(offset, value & 0xff);
    dataView.setUint16(offset + 1, value >> 8, true);
    return offset + 3;
  },
};

/**
 * 24-bit signed integer, Big Endian byte order
 */
export const INT24_BE: IToken<number> = {
  len: 3,
  get(array: Uint8Array, offset: number): number {
    const unsigned = UINT24_BE.get(array, offset);
    return unsigned > 0x7fffff ? unsigned - 0x1000000 : unsigned;
  },
  put(array: Uint8Array, offset: number, value: number): number {
    const dataView = dv(array);
    dataView.setUint16(offset, value >> 8);
    dataView.setUint8(offset + 2, value & 0xff);
    return offset + 3;
  },
};

/**
 * 32-bit signed integer, Big Endian byte order
 */
export const INT32_BE: IToken<number> = {
  len: 4,
  get(array: Uint8Array, offset: number): number {
    return dv(array).getInt32(offset);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setInt32(offset, value);
    return offset + 4;
  },
};

/**
 * 32-bit signed integer, Big Endian byte order
 */
export const INT32_LE: IToken<number> = {
  len: 4,
  get(array: Uint8Array, offset: number): number {
    return dv(array).getInt32(offset, true);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setInt32(offset, value, true);
    return offset + 4;
  },
};

/**
 * 64-bit unsigned integer, Little Endian byte order
 */
export const UINT64_LE: IToken<bigint> = {
  len: 8,
  get(array: Uint8Array, offset: number): bigint {
    return dv(array).getBigUint64(offset, true);
  },
  put(array: Uint8Array, offset: number, value: bigint): number {
    dv(array).setBigUint64(offset, value, true);
    return offset + 8;
  },
};

/**
 * 64-bit signed integer, Little Endian byte order
 */
export const INT64_LE: IToken<bigint> = {
  len: 8,
  get(array: Uint8Array, offset: number): bigint {
    return dv(array).getBigInt64(offset, true);
  },
  put(array: Uint8Array, offset: number, value: bigint): number {
    dv(array).setBigInt64(offset, value, true);
    return offset + 8;
  },
};

/**
 * 64-bit unsigned integer, Big Endian byte order
 */
export const UINT64_BE: IToken<bigint> = {
  len: 8,
  get(array: Uint8Array, offset: number): bigint {
    return dv(array).getBigUint64(offset);
  },
  put(array: Uint8Array, offset: number, value: bigint): number {
    dv(array).setBigUint64(offset, value);
    return offset + 8;
  },
};

/**
 * 64-bit signed integer, Big Endian byte order
 */
export const INT64_BE: IToken<bigint> = {
  len: 8,
  get(array: Uint8Array, offset: number): bigint {
    return dv(array).getBigInt64(offset);
  },
  put(array: Uint8Array, offset: number, value: bigint): number {
    dv(array).setBigInt64(offset, value);
    return offset + 8;
  },
};

/**
 * IEEE 754 16-bit (half precision) float, big endian
 */
export const Float16_BE: IToken<number> = {
  len: 2,
  get(dataView: Uint8Array, offset: number): number {
    return ieee754.read(dataView, offset, false, 10, this.len);
  },
  put(dataView: Uint8Array, offset: number, value: number): number {
    ieee754.write(dataView, value, offset, false, 10, this.len);
    return offset + this.len;
  },
};

/**
 * IEEE 754 16-bit (half precision) float, little endian
 */
export const Float16_LE: IToken<number> = {
  len: 2,
  get(array: Uint8Array, offset: number): number {
    return ieee754.read(array, offset, true, 10, this.len);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    ieee754.write(array, value, offset, true, 10, this.len);
    return offset + this.len;
  },
};

/**
 * IEEE 754 32-bit (single precision) float, big endian
 */
export const Float32_BE: IToken<number> = {
  len: 4,
  get(array: Uint8Array, offset: number): number {
    return dv(array).getFloat32(offset);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setFloat32(offset, value);
    return offset + 4;
  },
};

/**
 * IEEE 754 32-bit (single precision) float, little endian
 */
export const Float32_LE: IToken<number> = {
  len: 4,
  get(array: Uint8Array, offset: number): number {
    return dv(array).getFloat32(offset, true);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setFloat32(offset, value, true);
    return offset + 4;
  },
};

/**
 * IEEE 754 64-bit (double precision) float, big endian
 */
export const Float64_BE: IToken<number> = {
  len: 8,
  get(array: Uint8Array, offset: number): number {
    return dv(array).getFloat64(offset);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setFloat64(offset, value);
    return offset + 8;
  },
};

/**
 * IEEE 754 64-bit (double precision) float, little endian
 */
export const Float64_LE: IToken<number> = {
  len: 8,
  get(array: Uint8Array, offset: number): number {
    return dv(array).getFloat64(offset, true);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    dv(array).setFloat64(offset, value, true);
    return offset + 8;
  },
};

/**
 * IEEE 754 80-bit (extended precision) float, big endian
 */
export const Float80_BE: IToken<number> = {
  len: 10,
  get(array: Uint8Array, offset: number): number {
    return ieee754.read(array, offset, false, 63, this.len);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    ieee754.write(array, value, offset, false, 63, this.len);
    return offset + this.len;
  },
};

/**
 * IEEE 754 80-bit (extended precision) float, little endian
 */
export const Float80_LE: IToken<number> = {
  len: 10,
  get(array: Uint8Array, offset: number): number {
    return ieee754.read(array, offset, true, 63, this.len);
  },
  put(array: Uint8Array, offset: number, value: number): number {
    ieee754.write(array, value, offset, true, 63, this.len);
    return offset + this.len;
  },
};

/**
 * Ignore a given number of bytes
 */
export class IgnoreType implements IGetToken<void> {
  /**
   * @param len number of bytes to ignore
   */
  constructor(public len: number) {}

  // ToDo: don't read, but skip data
  public get(array: Uint8Array, off: number) {
    // empty
  }
}

export class Uint8ArrayType implements IGetToken<Uint8Array> {
  public constructor(public len: number) {}

  public get(array: Uint8Array, offset: number): Uint8Array {
    return array.subarray(offset, offset + this.len);
  }
}

export class BufferType implements IGetToken<Uint8Array, Buffer> {
  public constructor(public len: number) {}

  public get(uint8Array: Uint8Array, off: number): Buffer {
    return Buffer.from(uint8Array.subarray(off, off + this.len));
  }
}

/**
 * Consume a fixed number of bytes from the stream and return a string with a specified encoding.
 */
export class StringType implements IGetToken<string, Buffer> {
  public constructor(public len: number, public encoding: BufferEncoding) {}

  public get(uint8Array: Uint8Array, offset: number): string {
    return Buffer.from(uint8Array).toString(
      this.encoding,
      offset,
      offset + this.len
    );
  }
}

/**
 * ANSI Latin 1 String
 * Using windows-1252 / ISO 8859-1 decoding
 */
export class AnsiStringType implements IGetToken<string> {
  private static windows1252 = [
    8364, 129, 8218, 402, 8222, 8230, 8224, 8225, 710, 8240, 352, 8249, 338,
    141, 381, 143, 144, 8216, 8217, 8220, 8221, 8226, 8211, 8212, 732, 8482,
    353, 8250, 339, 157, 382, 376, 160, 161, 162, 163, 164, 165, 166, 167, 168,
    169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183,
    184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198,
    199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213,
    214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228,
    229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243,
    244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255,
  ];

  private static decode(
    buffer: Uint8Array,
    offset: number,
    until: number
  ): string {
    let str = "";
    for (let i = offset; i < until; ++i) {
      str += AnsiStringType.codePointToString(
        AnsiStringType.singleByteDecoder(buffer[i])
      );
    }
    return str;
  }

  private static inRange(a: number, min: number, max: number): boolean {
    return min <= a && a <= max;
  }

  private static codePointToString(cp: number): string {
    if (cp <= 0xffff) {
      return String.fromCharCode(cp);
    } else {
      cp -= 0x10000;
      return String.fromCharCode((cp >> 10) + 0xd800, (cp & 0x3ff) + 0xdc00);
    }
  }

  private static singleByteDecoder(bite: number): number {
    if (AnsiStringType.inRange(bite, 0x00, 0x7f)) {
      return bite;
    }

    const codePoint = AnsiStringType.windows1252[bite - 0x80];
    if (codePoint === null) {
      throw Error("invaliding encoding");
    }

    return codePoint;
  }

  public constructor(public len: number) {}

  public get(buffer: Buffer, offset: number = 0): string {
    return AnsiStringType.decode(buffer, offset, offset + this.len);
  }
}
