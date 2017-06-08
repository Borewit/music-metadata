import * as fs from 'fs-extra';

const assert = require('assert');

export type IFlush = (b: Buffer, o: number) => void;

// Possibly call flush()
const maybeFlush = function (b: Buffer, o, len: number, flush: IFlush) {
  if (o + len > b.length) {
    if (typeof(flush) !== 'function') {
      throw new Error(
        'Buffer out of space and no valid flush() function found'
      );
    }

    flush(b, o);

    return 0;
  }

  return o;
};

export interface IGetToken<T> {

  len: number;

  get: (buf: Buffer, off: number) => T;
}

export interface IToken<T> extends IGetToken<T> {
  put: (b: Buffer, o: number, v: T, flush: IFlush) => number
}

// Primitive types
export const UINT8: IToken<number> = {

  len: 1,

  get: function (buf, off): number {
    return buf[off];
  },

  put: function (b: Buffer, o: number, v: number, flush: IFlush): number {
    assert.equal(typeof o, 'number');
    assert.equal(typeof v, 'number');
    assert.ok(v >= 0 && v <= 0xff);
    assert.ok(o >= 0);
    assert.ok(this.len <= b.length);

    const no = maybeFlush(b, o, this.len, flush);
    b[no] = v & 0xff;

    return (no - o) + this.len;
  }
};

export const UINT16_LE: IToken<number> = {

  len: 2,

  get: function (buf, off): number {
    return buf[off] | (buf[off + 1] << 8);
  },

  put: function (b: Buffer, o: number, v: number, flush: IFlush): number {
    assert.equal(typeof o, 'number');
    assert.equal(typeof v, 'number');
    assert.ok(v >= 0 && v <= 0xffff);
    assert.ok(o >= 0);
    assert.ok(this.len <= b.length);

    const no = maybeFlush(b, o, this.len, flush);
    b[no] = v & 0xff;
    b[no + 1] = (v >>> 8) & 0xff;

    return (no - o) + this.len;
  }
};

export const UINT16_BE: IToken<number> = {

  len: 2,

  get: function (buf, off): number {
    return (buf[off] << 8) | buf[off + 1];
  },

  put: function (b: Buffer, o: number, v: number, flush: IFlush): number {
    assert.equal(typeof o, 'number');
    assert.equal(typeof v, 'number');
    assert.ok(v >= 0 && v <= 0xffff);
    assert.ok(o >= 0);
    assert.ok(this.len <= b.length);

    const no = maybeFlush(b, o, this.len, flush);
    b[no] = (v >>> 8) & 0xff;
    b[no + 1] = v & 0xff;

    return (no - o) + this.len;
  }
};

export const UINT24_LE: IToken<number> = {

  len: 3,

  get: function (buf, off): number {
    return buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16);
  },

  put: function (b: Buffer, o: number, v: number, flush: IFlush): number {
    assert.equal(typeof o, 'number');
    assert.equal(typeof v, 'number');
    assert.ok(v >= 0 && v <= 0xffffff);
    assert.ok(o >= 0);
    assert.ok(this.len <= b.length);

    const no = maybeFlush(b, o, this.len, flush);
    b[no] = v & 0xff;
    b[no + 1] = (v >>> 8) & 0xff;
    b[no + 2] = (v >>> 16) & 0xff;

    return (no - o) + this.len;
  }
};

export const UINT24_BE: IToken<number> = {

  len: 3,

  get: function (buf, off): number {
    return (((buf[off] << 8) + buf[off + 1]) << 8) + buf[off + 2]
  },

  put: function (b: Buffer, o: number, v: number, flush: IFlush): number {
    assert.equal(typeof o, 'number');
    assert.equal(typeof v, 'number');
    assert.ok(v >= 0 && v <= 0xffffff);
    assert.ok(o >= 0);
    assert.ok(this.len <= b.length);

    const no = maybeFlush(b, o, this.len, flush);
    b[no] = (v >>> 16) & 0xff;
    b[no + 1] = (v >>> 8) & 0xff;
    b[no + 2] = v & 0xff;

    return (no - o) + this.len;
  }
};

export const UINT32_LE: IToken<number> = {

  len: 4,

  get: function (buf, off): number {
    // Shifting the MSB by 24 directly causes it to go negative if its
    // last bit is high, so we instead shift by 23 and multiply by 2.
    // Also, using binary OR to count the MSB if its last bit is high
    // causes the value to go negative. Use addition there.
    return (buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16)) +
      ((buf[off + 3] << 23) * 2);
  },

  put: function (b: Buffer, o: number, v: number, flush: IFlush): number {
    assert.equal(typeof o, 'number');
    assert.equal(typeof v, 'number');
    assert.ok(v >= 0 && v <= 0xffffffff);
    assert.ok(o >= 0);
    assert.ok(this.len <= b.length);

    const no = maybeFlush(b, o, this.len, flush);
    b[no] = v & 0xff;
    b[no + 1] = (v >>> 8) & 0xff;
    b[no + 2] = (v >>> 16) & 0xff;
    b[no + 3] = (v >>> 24) & 0xff;

    return (no - o) + this.len;
  }
};

export const UINT32_BE: IToken<number> = {

  len: 4,

  get: function (buf, off): number {
    // See comments in UINT32_LE.get()
    return ((buf[off] << 23) * 2) +
      ((buf[off + 1] << 16) | (buf[off + 2] << 8) | buf[off + 3]);
  },

  put: function (b: Buffer, o: number, v: number, flush: IFlush): number {
    assert.equal(typeof o, 'number');
    assert.equal(typeof v, 'number');
    assert.ok(v >= 0 && v <= 0xffffffff);
    assert.ok(o >= 0);
    assert.ok(this.len <= b.length);

    const no = maybeFlush(b, o, this.len, flush);
    b[no] = (v >>> 24) & 0xff;
    b[no + 1] = (v >>> 16) & 0xff;
    b[no + 2] = (v >>> 8) & 0xff;
    b[no + 3] = v & 0xff;

    return (no - o) + this.len;
  }
};

export const INT8: IToken<number> = {

  len: 1,

  get: function (buf, off): number {
    const v = UINT8.get(buf, off);
    return ((v & 0x80) === 0x80) ?
      (-128 + (v & 0x7f)) :
      v;
  },

  put: function (b: Buffer, o: number, v: number, flush: IFlush): number {
    assert.equal(typeof o, 'number');
    assert.equal(typeof v, 'number');
    assert.ok(v >= -128 && v <= 127);
    assert.ok(o >= 0);
    assert.ok(this.len <= b.length);

    const no = maybeFlush(b, o, this.len, flush);
    b[no] = v & 0xff;

    return (no - o) + this.len;
  }
};

export const INT16_BE: IToken<number> = {
  len: 2,
  get: function (buf, off): number {
    const v = UINT16_BE.get(buf, off);
    return ((v & 0x8000) === 0x8000) ?
      (-32768 + (v & 0x7fff)) :
      v;
  },
  put: function (b: Buffer, o: number, v: number, flush: IFlush): number {
    assert.equal(typeof o, 'number');
    assert.equal(typeof v, 'number');
    assert.ok(v >= -32768 && v <= 32767);
    assert.ok(o >= 0);
    assert.ok(this.len <= b.length);

    const no = maybeFlush(b, o, this.len, flush);
    b[no] = ((v & 0xffff) >>> 8) & 0xff;
    b[no + 1] = v & 0xff;

    return (no - o) + this.len;
  }
};

export const INT24_BE: IToken<number> = {
  len: 3,
  get: function (buf, off): number {
    const v = UINT24_BE.get(buf, off);
    return ((v & 0x800000) === 0x800000) ?
      (-0x800000 + (v & 0x7fffff)) : v;
  },
  put: function (b: Buffer, o: number, v: number, flush: IFlush): number {
    assert.equal(typeof o, 'number');
    assert.equal(typeof v, 'number');
    assert.ok(v >= -0x800000 && v <= 0x7fffff);
    assert.ok(o >= 0);
    assert.ok(this.len <= b.length);

    const no = maybeFlush(b, o, this.len, flush);
    b[no] = (v >>> 16) & 0xff;
    b[no + 1] = (v >>> 8) & 0xff;
    b[no + 2] = v & 0xff;

    return (no - o) + this.len;
  }
};

export const INT32_BE: IToken<number> = {
  len: 4,
  get: function (buf, off): number {
    // We cannot check for 0x80000000 directly, as this always returns
    // false. Instead, check for the two's-compliment value, which
    // behaves as expected. Also, we cannot subtract our value all at
    // once, so do it in two steps to avoid sign busting.
    const v = UINT32_BE.get(buf, off);
    return ((v & 0x80000000) === -2147483648) ?
      ((v & 0x7fffffff) - 1073741824 - 1073741824) :
      v;
  },
  put: function (b: Buffer, o: number, v: number, flush: IFlush): number {
    assert.equal(typeof o, 'number');
    assert.equal(typeof v, 'number');
    assert.ok(v >= -2147483648 && v <= 2147483647);
    assert.ok(o >= 0);
    assert.ok(this.len <= b.length);

    const no = maybeFlush(b, o, this.len, flush);
    b[no] = (v >>> 24) & 0xff;
    b[no + 1] = (v >>> 16) & 0xff;
    b[no + 2] = (v >>> 8) & 0xff;
    b[no + 3] = v & 0xff;

    return (no - o) + this.len;
  }
};

export class BufferType implements IGetToken<Buffer> {

  constructor(public len: number) {
  }

  public get(buf: Buffer, off: number): Buffer {
    return buf.slice(off, off + this.len);
  }
}

export class StringType implements IGetToken<string> {

  constructor(public len: number, public encoding: string) {
  }

  public get(buf: Buffer, off: number): string {
    return buf.toString(this.encoding, off, off + this.len);
  }
}

export class IgnoreType implements IGetToken<Buffer> {

  constructor(public len: number) {
  }

  // ToDo: don't read,, but skip data
  public get(buf: Buffer, off: number): Buffer {
    return buf.slice(off, off + this.len);
  }
}

export interface ITokenizer {

  fileSize: number;

  readBuffer(buffer: Buffer, offset: number, length: number, position?: number): Promise<number>;

  readToken<T>(token: IGetToken<T>, position?: number | null): Promise<T>;

  readNumber(token: IToken<number>): Promise<number>;
}

export class FileTokenizer implements ITokenizer{

  private numBuffer = new Buffer(4);

  constructor(private fd: number, public fileSize: number) {
  }

  public readBuffer(buffer: Buffer, offset: number, length: number, position: number = null): Promise<number> {
    return fs.read(this.fd, buffer, offset, length, position); // ToDo: looks like wrong return type is defined in fs.read
  }

  private _readToken<T>(buffer: Buffer, token: IToken<T>): Promise<T> {
    return this.readBuffer(buffer, 0, token.len, null).then((res) => {
      return token.get(buffer, 0);
    });
  }

  public readToken<T>(token: IGetToken<T>, position: number | null = null): Promise<T> {
    const buffer = new Buffer(token.len);
    return this.readBuffer(buffer, 0, token.len, position).then((res) => {
      if(res<token.len) {
        return null; // EOF
      }
      return token.get(buffer, 0);
    });
  }

  public readNumber(token: IToken<number>): Promise<number> {
    return this._readToken(this.numBuffer, token);
  }

  public static open(filePath: string): Promise<FileTokenizer> {
    return fs.pathExists(filePath).then((exist) => {
      if (!exist) {
        throw new Error("File not found: " + filePath);
      }
      return fs.stat(filePath).then((stat) => {
        return fs.open(filePath, "r").then((fd) => {
          return new FileTokenizer(fd, stat.size);
        })
      })
    });
  }
}
