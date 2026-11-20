import {
  EndOfStreamError,
  type IFileInfo,
  type IGetToken,
  type IReadChunkOptions,
  type ITokenizer,
  isRandomAccessTokenizer
} from 'strtok3';

/** Random-access sources can fill a larger lookahead; streams must not wait for bytes that may never arrive. */
const randomAccessBufferSize = 16384;
const streamBufferSize = 1024;

/**
 * Reuse a bounded lookahead for small sequential reads without advancing the source during peeks.
 * Implements ITokenizer so it can be passed to parsers as a drop-in wrapper.
 */
export class TokenizerCache implements ITokenizer {
  public readonly buffer: Uint8Array;
  public length = 0;
  private start = 0;
  private readonly validatedTokenLengths = new Set<number>();

  public constructor(protected readonly tokenizer: ITokenizer) {
    this.buffer = new Uint8Array(isRandomAccessTokenizer(tokenizer) ? randomAccessBufferSize : streamBufferSize);
  }

  public get fileInfo(): IFileInfo {
    return this.tokenizer.fileInfo;
  }

  public get position(): number {
    return this.tokenizer.position;
  }

  public async refresh(): Promise<void> {
    // Invalidate first: a failed peek must not expose bytes from the previous window.
    this.length = 0;
    this.start = this.tokenizer.position;
    this.length = await this.tokenizer.peekBuffer(this.buffer, { mayBeLess: true });
  }

  protected cachedOffset(length: number): number | undefined {
    const offset = this.tokenizer.position - this.start;
    return Number.isSafeInteger(length) && length >= 0 && offset >= 0 && offset + length <= this.length
      ? offset
      : undefined;
  }

  public async peekBuffer(buffer: Uint8Array, options?: IReadChunkOptions): Promise<number> {
    const length = options?.length ?? buffer.length;
    const offset = this.cachedOffset(length);
    if (offset === undefined || (options?.position !== undefined && options.position !== this.tokenizer.position)) {
      return this.tokenizer.peekBuffer(buffer, options);
    }
    buffer.set(this.buffer.subarray(offset, offset + length));
    return length;
  }

  public async readBuffer(buffer: Uint8Array, options?: IReadChunkOptions): Promise<number> {
    const length = options?.length ?? buffer.length;
    const offset = this.cachedOffset(length);
    const size = this.tokenizer.fileInfo.size;
    if (
      offset === undefined ||
      (options?.position !== undefined && options.position !== this.tokenizer.position) ||
      (size !== undefined && this.tokenizer.position + length > size)
    ) {
      // Buffer reads can extend beyond an inaccurate size; ignore() would cap them.
      return this.tokenizer.readBuffer(buffer, options);
    }
    buffer.set(this.buffer.subarray(offset, offset + length));
    await this.consume(length);
    return length;
  }

  public async peekToken<T>(token: IGetToken<T>, position?: number | null, _maybeless?: boolean): Promise<T> {
    const offset = this.tokenOffset(token.len);
    if (offset === undefined || (position != null && position !== this.tokenizer.position)) {
      const value = await this.tokenizer.peekToken(token, position);
      this.validatedTokenLengths.add(token.len);
      return value;
    }
    // Copy the token bytes: token implementations may retain the supplied buffer.
    return token.get(this.buffer.slice(offset, offset + token.len), 0);
  }

  public async readToken<T>(token: IGetToken<T>, position?: number): Promise<T> {
    const offset = this.tokenOffset(token.len);
    if (offset === undefined || (position !== undefined && position !== this.tokenizer.position)) {
      const value = await this.tokenizer.readToken(token, position);
      this.validatedTokenLengths.add(token.len);
      return value;
    }
    await this.consume(token.len);
    // Copy the token bytes: token implementations may retain the supplied buffer.
    return token.get(this.buffer.slice(offset, offset + token.len), 0);
  }

  public peekNumber(token: IGetToken<number>): Promise<number> {
    return this.tokenizer.peekNumber(token);
  }

  public readNumber(token: IGetToken<number>): Promise<number> {
    return this.tokenizer.readNumber(token);
  }

  private tokenOffset(length: number): number | undefined {
    // Tokenizer allocation limits are not exposed by ITokenizer. Let the source
    // validate each token length once before reusing it, including custom limits.
    if (!this.validatedTokenLengths.has(length)) {
      return undefined;
    }
    // A file peek can extend beyond an inaccurate advertised size; token reads cannot.
    const size = this.tokenizer.fileInfo.size;
    return size !== undefined && this.tokenizer.position + length > size ? undefined : this.cachedOffset(length);
  }

  public ignore(length: number): Promise<number> {
    return this.tokenizer.ignore(length);
  }

  public setPosition(position: number): void {
    const tokenizer = this.tokenizer;
    if (!isRandomAccessTokenizer(tokenizer)) {
      throw new Error('Tokenizer does not support random access');
    }
    tokenizer.setPosition(position);
  }

  public supportsRandomAccess(): boolean {
    return this.tokenizer.supportsRandomAccess();
  }

  public close(): Promise<void> {
    return this.tokenizer.close();
  }

  public abort(): Promise<void> {
    return this.tokenizer.abort();
  }

  private async consume(length: number): Promise<void> {
    // Streams still consume every byte. A short custom ignore is not a complete read.
    if ((await this.tokenizer.ignore(length)) !== length) {
      throw new EndOfStreamError();
    }
  }
}
