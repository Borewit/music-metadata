import { IRandomReader } from '../type';
import * as fs from "fs";

/**
 * Provides abstract file access via the IRandomRead interface
 */
export class RandomFileReader implements IRandomReader {

  private readonly fd: number;

  constructor(filePath: string, public fileSize: number) {
    this.fd = fs.openSync(filePath, 'r');
  }

  /**
   * Read from a given position of an abstracted file or buffer.
   * @param buffer {Buffer} is the buffer that the data will be written to.
   * @param offset {number} is the offset in the buffer to start writing at.
   * @param length {number}is an integer specifying the number of bytes to read.
   * @param position {number} is an argument specifying where to begin reading from in the file.
   * @return {Promise<number>} bytes read
   */
  public randomRead(buffer: Buffer, offset: number, length: number, position: number): Promise<number> {
    return new Promise((resolve, reject) => {
      fs.read(this.fd, buffer, offset, length, position, (err, bytesRead) => {
        if (err) {
          reject(err);
        } else {
          resolve(bytesRead);
        }
      });
    });
  }

  public close() {
    fs.closeSync(this.fd);
  }
}
