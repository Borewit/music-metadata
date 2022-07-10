import { AbstractTokenizer } from "./AbstractTokenizer";
import { EndOfStreamError } from "../peek-readable";
import * as fs from "./FsPromise";
import { IFileInfo, IReadChunkOptions } from "./types";

export class FileTokenizer extends AbstractTokenizer {
  public constructor(private fd: number, fileInfo: IFileInfo) {
    super(fileInfo);
  }

  /**
   * Read buffer from file
   * @param uint8Array - Uint8Array to write result to
   * @param options - Read behaviour options
   * @returns Promise number of bytes read
   */
  public async readBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number> {
    const normOptions = this.normalizeOptions(uint8Array, options);
    this.position = normOptions.position;
    const res = await fs.read(this.fd, uint8Array, normOptions.offset, normOptions.length, normOptions.position);
    this.position += res.bytesRead;
    if (res.bytesRead < normOptions.length && (!options || !options.mayBeLess)) {
      throw new EndOfStreamError();
    }
    return res.bytesRead;
  }

  /**
   * Peek buffer from file
   * @param uint8Array - Uint8Array (or Buffer) to write data to
   * @param options - Read behaviour options
   * @returns Promise number of bytes read
   */
  public async peekBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number> {
    const normOptions = this.normalizeOptions(uint8Array, options);

    const res = await fs.read(this.fd, uint8Array, normOptions.offset, normOptions.length, normOptions.position);
    if (!normOptions.mayBeLess && res.bytesRead < normOptions.length) {
      throw new EndOfStreamError();
    }
    return res.bytesRead;
  }

  public override async close(): Promise<void> {
    return fs.close(this.fd);
  }
}
