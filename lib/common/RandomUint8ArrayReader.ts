import { IRandomReader } from '../type.js';

/**
 * Provides abstract Uint8Array access via the IRandomRead interface
 */
export class RandomUint8ArrayReader implements IRandomReader {

  public readonly fileSize: number;

  constructor(private readonly uint8Array: Uint8Array) {
    this.fileSize = uint8Array.length;
  }

  /**
   * Read from a given position of an abstracted file or buffer.
   * @param uint8Array - Uint8Array that the data will be written to.
   * @param offset - Offset in the buffer to start writing at.
   * @param length - Integer specifying the number of bytes to read.
   * @param position - Specifies where to begin reading from in the file.
   * @return Promise providing bytes read
   */
  public async randomRead(uint8Array: Uint8Array, offset: number, length: number, position: number): Promise<number> {
    uint8Array.set(this.uint8Array.subarray(position, position + length), offset);
    return length;
  }
}
