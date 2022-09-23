import { EndOfStreamError } from "../peek-readable/EndOfFileStream";

import { AbstractTokenizer } from "./AbstractTokenizer";

import type { IFileInfo, IReadChunkOptions } from "./types";

export class BufferTokenizer extends AbstractTokenizer {
  /**
   * Construct BufferTokenizer
   * @param uint8Array - Uint8Array to tokenize
   * @param fileInfo - Pass additional file information to the tokenizer
   */
  constructor(private uint8Array: Uint8Array, fileInfo?: IFileInfo) {
    super(fileInfo);
    this.fileInfo.size = this.fileInfo.size > 0 ? this.fileInfo.size : uint8Array.length;
  }

  /**
   * Read buffer from tokenizer
   * @param uint8Array - Uint8Array to tokenize
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  public async readBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number> {
    if (options?.position) {
      if (options.position < this.position) {
        throw new Error("`options.position` must be equal or greater than `tokenizer.position`");
      }
      this.position = options.position;
    }

    const bytesRead = await this.peekBuffer(uint8Array, options);
    this.position += bytesRead;
    return bytesRead;
  }

  /**
   * Peek (read ahead) buffer from tokenizer
   * @param uint8Array
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  public peekBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number> {
    const normOptions = this.normalizeOptions(uint8Array, options);

    const bytes2read = Math.min(this.uint8Array.length - normOptions.position, normOptions.length);
    if (!normOptions.mayBeLess && bytes2read < normOptions.length) {
      throw new EndOfStreamError();
    } else {
      uint8Array.set(
        this.uint8Array.subarray(normOptions.position, normOptions.position + bytes2read),
        normOptions.offset
      );
      return Promise.resolve(bytes2read);
    }
  }

  public override async close(): Promise<void> {
    // empty
  }
}
