import type { IRandomAccessTokenizer } from 'strtok3';

import { InvalidFileError } from './errors.js';

/** Random-access byte source shared by every container writer and platform. */
export interface ByteSource {
  readonly tokenizer: IRandomAccessTokenizer;
  readonly size: number;
  read(offset: number, length: number): Promise<Uint8Array>;
  close(): Promise<void>;
}

export class TokenizerSource implements ByteSource {
  public constructor(public readonly tokenizer: IRandomAccessTokenizer) {}

  public get size(): number {
    return this.tokenizer.fileInfo.size;
  }

  public async read(offset: number, length: number): Promise<Uint8Array> {
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(length) || length < 0) {
      throw new InvalidFileError(`Invalid read range: offset=${offset}, length=${length}`);
    }
    if (offset + length > this.size) {
      throw new InvalidFileError(
        `Unexpected end of file: need ${length} byte(s) at offset ${offset}, but only ${this.size - offset} available`
      );
    }
    if (length === 0) {
      return new Uint8Array(0);
    }

    const result = new Uint8Array(length);
    // Tokenizers complete the requested range or reach EOF, independent of transport fragmentation.
    const bytesRead = await this.tokenizer.readBuffer(result, {
      position: offset,
      length,
      mayBeLess: true
    });
    if (bytesRead !== length) {
      throw new InvalidFileError(`Unexpected end of file while reading at offset ${offset + bytesRead}`);
    }
    return result;
  }

  public async close(): Promise<void> {
    await this.tokenizer.close();
  }
}
