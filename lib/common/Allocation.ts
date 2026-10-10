import type { IGetToken } from '@tokenizer/token';
import { EndOfStreamError, type IFileInfo, type ITokenizer, type ITokenizerOptions } from 'strtok3';
import { UnexpectedFileContentError } from '../ParseError.js';
import type { IOptions } from '../type.js';

const defaultMaxMemoryAllocation = 64 * 1024 * 1024;
const readChunkSize = 64 * 1024;
type ErrorFactory = (message: string) => Error;
const allocationError: ErrorFactory = message => new UnexpectedFileContentError('metadata', message);

export function getMaxMemoryAllocation(options: IOptions): number {
  const limit = options.maxMemoryAllocation ?? defaultMaxMemoryAllocation;
  if (!Number.isSafeInteger(limit) || limit <= 0) {
    throw new RangeError('maxMemoryAllocation must be a positive safe integer');
  }
  return limit;
}

/** Configure the tokenizer safety net once, using the same limit as parser-owned buffers. */
export function getTokenizerOptions(options: IOptions, fileInfo?: IFileInfo): ITokenizerOptions {
  return { maxBufferSize: getMaxMemoryAllocation(options), fileInfo };
}

/** Check untrusted lengths before allocating, including accumulated stream payloads. */
export function validateAllocation(length: number, options: IOptions, makeError: ErrorFactory = allocationError): void {
  if (!Number.isSafeInteger(length) || length < 0) {
    throw makeError(`Invalid allocation size: ${length}`);
  }
  const limit = getMaxMemoryAllocation(options);
  if (length > limit) {
    throw makeError(`Metadata size ${length} exceeds allocation limit ${limit} (buffering limit)`);
  }
}

function validateAvailableBytes(tokenizer: ITokenizer, length: number, position: number): void {
  if (tokenizer.fileInfo.size !== undefined && length > tokenizer.fileInfo.size - position) {
    throw new EndOfStreamError();
  }
}

/** Read only bounded chunks from streams; an advertised stream size does not prove bytes exist. */
export async function readBuffer(
  tokenizer: ITokenizer,
  length: number,
  options: IOptions,
  position = tokenizer.position,
  makeError: ErrorFactory = allocationError
): Promise<Uint8Array> {
  validateAllocation(length, options, makeError);
  validateAvailableBytes(tokenizer, length, position);
  if ((!tokenizer.supportsRandomAccess() || tokenizer.fileInfo.size === undefined) && length > readChunkSize) {
    const chunks: Uint8Array[] = [];
    for (let remaining = length; remaining > 0; ) {
      const chunk = new Uint8Array(Math.min(remaining, readChunkSize));
      const bytesRead = await tokenizer.readBuffer(chunk, { position });
      if (bytesRead !== chunk.length) {
        throw new EndOfStreamError();
      }
      chunks.push(chunk);
      remaining -= chunk.length;
      position += chunk.length;
    }
    const buffer = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }
    return buffer;
  }
  const buffer = new Uint8Array(length);
  if ((await tokenizer.readBuffer(buffer, { position })) !== length) {
    throw new EndOfStreamError();
  }
  return buffer;
}

/** Bound custom tokenizer reads and buffer large stream payloads incrementally. */
export async function readToken<T>(
  tokenizer: ITokenizer,
  token: IGetToken<T>,
  options: IOptions,
  position = tokenizer.position,
  makeError: ErrorFactory = allocationError
): Promise<T> {
  validateAllocation(token.len, options, makeError);
  validateAvailableBytes(tokenizer, token.len, position);
  if (token.len <= readChunkSize) {
    return tokenizer.readToken(token, position);
  }
  return token.get(await readBuffer(tokenizer, token.len, options, position, makeError), 0);
}
