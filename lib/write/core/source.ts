import type { IRandomAccessTokenizer } from 'strtok3';
import { fromBuffer, fromFile } from 'strtok3';

import { InvalidFileError } from './errors.js';

/**
 * Random-access byte source used by the container writers.
 *
 * The file implementation is backed by `strtok3`'s `FileTokenizer`, so the
 * writer shares tokenization and file handling with the rest of the
 * `music-metadata` ecosystem.
 */
export interface ByteSource {
  readonly tokenizer: IRandomAccessTokenizer;
  readonly size: number;
  read(offset: number, length: number): Promise<Uint8Array>;
  close(): Promise<void>;
}

class TokenizerSource implements ByteSource {
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
    let read = 0;
    while (read < length) {
      const bytesRead = await this.tokenizer.readBuffer(result.subarray(read), {
        position: offset + read,
        length: length - read,
        mayBeLess: true
      });
      if (bytesRead === 0) {
        throw new InvalidFileError(`Unexpected end of file while reading at offset ${offset + read}`);
      }
      read += bytesRead;
    }
    return result;
  }

  public async close(): Promise<void> {
    await this.tokenizer.close();
  }
}

/**
 * Open a random-access source from a file path or an in-memory buffer.
 */
export async function openSource(input: string | Uint8Array): Promise<ByteSource> {
  if (typeof input === 'string') {
    const tokenizer = await fromFile(input, { regularFileOnly: true });
    return new TokenizerSource(tokenizer);
  }
  const tokenizer = fromBuffer(input);
  return new TokenizerSource(tokenizer);
}
