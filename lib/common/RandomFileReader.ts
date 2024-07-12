import * as fs from 'fs';

import { IRandomReader } from '../type.js';

/**
 * Provides abstract file access via the IRandomRead interface
 */
export class RandomFileReader implements IRandomReader {

  private constructor(private readonly fileHandle: fs.promises.FileHandle, public filePath: string, public fileSize: number) {
  }

  /**
   * Read from a given position of an abstracted file or buffer.
   * @param buffer {Uint8Array} is the buffer that the data will be written to.
   * @param offset {number} is the offset in the buffer to start writing at.
   * @param length {number}is an integer specifying the number of bytes to read.
   * @param position {number} is an argument specifying where to begin reading from in the file.
   * @return {Promise<number>} bytes read
   */
  public async randomRead(buffer: Uint8Array, offset: number, length: number, position: number): Promise<number> {
    const result = await this.fileHandle.read(buffer, offset, length, position);
    return result.bytesRead;
  }

  public async close() {
    return this.fileHandle.close();
  }

  public static async init(filePath: string, fileSize: number): Promise<RandomFileReader> {
    const fileHandle = await fs.promises.open(filePath, 'r');
    return new RandomFileReader(fileHandle, filePath, fileSize);
  }
}
