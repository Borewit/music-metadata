import { EndOfStreamError, StreamReader } from "../peek-readable";

import { AbstractTokenizer } from "./AbstractTokenizer";

import type { IFileInfo, IReadChunkOptions } from "./types";
import type { Readable } from "node:stream";

const maxBufferSize = 256_000;

export class ReadStreamTokenizer extends AbstractTokenizer {
  private streamReader: StreamReader;

  public constructor(stream: Readable, fileInfo?: IFileInfo) {
    super(fileInfo);
    this.streamReader = new StreamReader(stream);
  }

  /**
   * Get file information, an HTTP-client may implement this doing a HEAD request
   * @returns Promise with file information
   */
  public getFileInfo(): IFileInfo {
    return this.fileInfo;
  }

  /**
   * Read buffer from tokenizer
   * @param uint8Array - Target Uint8Array to fill with data read from the tokenizer-stream
   * @param options - Read behaviour options
   * @returns Promise with number of bytes read
   */
  public async readBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number> {
    const normOptions = this.normalizeOptions(uint8Array, options);
    const skipBytes = normOptions.position - this.position;
    if (skipBytes > 0) {
      await this.ignore(skipBytes);
      return this.readBuffer(uint8Array, options);
    } else if (skipBytes < 0) {
      throw new Error("`options.position` must be equal or greater than `tokenizer.position`");
    }

    if (normOptions.length === 0) {
      return 0;
    }

    const bytesRead = await this.streamReader.read(uint8Array, normOptions.offset, normOptions.length);
    this.position += bytesRead;
    if ((!options || !options.mayBeLess) && bytesRead < normOptions.length) {
      throw new EndOfStreamError();
    }
    return bytesRead;
  }

  /**
   * Peek (read ahead) buffer from tokenizer
   * @param uint8Array - Uint8Array (or Buffer) to write data to
   * @param options - Read behaviour options
   * @returns Promise with number of bytes peeked
   */
  public async peekBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number> {
    const normOptions = this.normalizeOptions(uint8Array, options);
    let bytesRead = 0;

    if (normOptions.position) {
      const skipBytes = normOptions.position - this.position;
      if (skipBytes > 0) {
        const skipBuffer = new Uint8Array(normOptions.length + skipBytes);
        bytesRead = await this.peekBuffer(skipBuffer, {
          mayBeLess: normOptions.mayBeLess,
        });
        uint8Array.set(skipBuffer.subarray(skipBytes), normOptions.offset);
        return bytesRead - skipBytes;
      } else if (skipBytes < 0) {
        throw new Error("Cannot peek from a negative offset in a stream");
      }
    }

    if (normOptions.length > 0) {
      try {
        bytesRead = await this.streamReader.peek(uint8Array, normOptions.offset, normOptions.length);
      } catch (error) {
        if (options?.mayBeLess && error instanceof EndOfStreamError) {
          return 0;
        }
        throw error;
      }
      if (!normOptions.mayBeLess && bytesRead < normOptions.length) {
        throw new EndOfStreamError();
      }
    }

    return bytesRead;
  }

  public override async ignore(length: number): Promise<number> {
    // debug(`ignore ${this.position}...${this.position + length - 1}`);
    const bufSize = Math.min(maxBufferSize, length);
    const buf = new Uint8Array(bufSize);
    let totBytesRead = 0;
    while (totBytesRead < length) {
      const remaining = length - totBytesRead;
      const bytesRead = await this.readBuffer(buf, {
        length: Math.min(bufSize, remaining),
      });
      if (bytesRead < 0) {
        return bytesRead;
      }
      totBytesRead += bytesRead;
    }
    return totBytesRead;
  }
}
