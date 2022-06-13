import { IGetToken } from "./type";

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
