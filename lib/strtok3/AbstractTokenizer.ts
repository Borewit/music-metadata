import { EndOfStreamError } from "../peek-readable/EndOfFileStream";

import type { IToken, IGetToken } from "../token-types";
import type { ITokenizer, IFileInfo, IReadChunkOptions } from "./types";

interface INormalizedReadChunkOptions extends IReadChunkOptions {
  offset: number;
  length: number;
  position: number;
  mayBeLess?: boolean;
}

/**
 * Core tokenizer
 */
export abstract class AbstractTokenizer implements ITokenizer {
  public fileInfo: IFileInfo;

  protected constructor(fileInfo?: IFileInfo) {
    this.fileInfo = fileInfo ?? {};
  }

  /**
   * Tokenizer-stream position
   */
  public position = 0;

  private numBuffer = new Uint8Array(8);

  /**
   * Read buffer from tokenizer
   * @param buffer - Target buffer to fill with data read from the tokenizer-stream
   * @param options - Additional read options
   * @returns Promise with number of bytes read
   */
  public abstract readBuffer(buffer: Uint8Array, options?: IReadChunkOptions): Promise<number>;

  /**
   * Peek (read ahead) buffer from tokenizer
   * @param uint8Array- Target buffer to fill with data peek from the tokenizer-stream
   * @param options - Peek behaviour options
   * @returns Promise with number of bytes read
   */
  public abstract peekBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number>;

  /**
   * Read a token from the tokenizer-stream
   * @param token - The token to read
   * @param position - If provided, the desired position in the tokenizer-stream
   * @returns Promise with token data
   */
  public async readToken<Value>(token: IGetToken<Value>, position: number = this.position): Promise<Value> {
    const uint8Array = new Uint8Array(token.len);
    const len = await this.readBuffer(uint8Array, { position });
    if (len < token.len) throw new EndOfStreamError();
    return token.get(uint8Array, 0);
  }

  /**
   * Peek a token from the tokenizer-stream.
   * @param token - Token to peek from the tokenizer-stream.
   * @param position - Offset where to begin reading within the file. If position is null, data will be read from the current file position.
   * @returns Promise with token data
   */
  public async peekToken<Value>(token: IGetToken<Value>, position: number = this.position): Promise<Value> {
    const uint8Array = new Uint8Array(token.len);
    const len = await this.peekBuffer(uint8Array, { position });
    if (len < token.len) throw new EndOfStreamError();
    return token.get(uint8Array, 0);
  }

  /**
   * Read a numeric token from the stream
   * @param token - Numeric token
   * @returns Promise with number
   */
  public async readNumber(token: IToken<number>): Promise<number> {
    const len = await this.readBuffer(this.numBuffer, { length: token.len });
    if (len < token.len) throw new EndOfStreamError();
    return token.get(this.numBuffer, 0);
  }

  /**
   * Read a numeric token from the stream
   * @param token - Numeric token
   * @returns Promise with number
   */
  public async peekNumber(token: IToken<number>): Promise<number> {
    const len = await this.peekBuffer(this.numBuffer, { length: token.len });
    if (len < token.len) throw new EndOfStreamError();
    return token.get(this.numBuffer, 0);
  }

  /**
   * Ignore number of bytes, advances the pointer in under tokenizer-stream.
   * @param length - Number of bytes to ignore
   * @returns resolves the number of bytes ignored, equals length if this available, otherwise the number of bytes available
   */
  public ignore(length: number): Promise<number> {
    if (this.fileInfo.size !== undefined) {
      const bytesLeft = this.fileInfo.size - this.position;
      if (length > bytesLeft) {
        this.position += bytesLeft;
        return Promise.resolve(bytesLeft);
      }
    }
    this.position += length;
    return Promise.resolve(length);
  }

  public async close(): Promise<void> {
    // empty
  }

  protected normalizeOptions(uint8Array: Uint8Array, options?: IReadChunkOptions): INormalizedReadChunkOptions {
    if (options?.position !== undefined && options.position < this.position) {
      throw new Error("`options.position` must be equal or greater than `tokenizer.position`");
    }

    if (options) {
      return {
        mayBeLess: options.mayBeLess === true,
        offset: options.offset ?? 0,
        length: options.length > 0 ? options.length : uint8Array.length - (options.offset ?? 0),
        position: options.position ?? this.position,
      };
    }

    return {
      mayBeLess: false,
      offset: 0,
      length: uint8Array.length,
      position: this.position,
    };
  }
}
