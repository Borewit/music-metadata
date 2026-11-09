import type { IRandomAccessTokenizer } from 'strtok3';
import { fromBlob, fromBuffer } from 'strtok3';

import { InvalidFileError } from './errors.js';

/**
 * Random-access byte source used by the container writers.
 *
 * The browser implementation is backed by `strtok3`'s `BlobTokenizer` and `BufferTokenizer`.
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
 * Realm-independent Blob check: `instanceof Blob` fails for Blobs from other
 * browser realms (e.g. iframes), so also accept any object exposing `size`.
 */
function isBlob(input: Blob | Uint8Array): input is Blob {
  return input instanceof Blob || 'size' in input;
}

/**
 * Open a random-access source from a Blob or an in-memory buffer.
 */
export async function openSource(input: Blob | Uint8Array): Promise<ByteSource> {
  if (isBlob(input)) {
    const tokenizer = fromBlob(input);
    return new TokenizerSource(tokenizer);
  }
  const tokenizer = fromBuffer(input);
  return new TokenizerSource(tokenizer);
}
