import type { ByteSource } from './source.browser.js';

export type WriteChunk =
  | Uint8Array
  | {
      source: ByteSource;
      offset: number;
      length: number;
    };

export interface BrowserWriteOptions {
  /** Build the update and return the expected byte count without writing. */
  dryRun?: boolean;
}

export interface BrowserWriteResult {
  bytesWritten: number;
}

/**
 * Write chunks to a new Uint8Array buffer.
 *
 * The input chunks may include Uint8Array values and source ranges that are
 * read lazily. The output is assembled in memory.
 */
export async function writeBuffer(
  chunks: readonly WriteChunk[],
  options: BrowserWriteOptions = {}
): Promise<Uint8Array> {
  const totalBytes = chunks.reduce((sum, chunk) => sum + chunkLength(chunk), 0);

  if (options.dryRun) {
    return new Uint8Array(totalBytes);
  }

  const output = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    const bytes = chunk instanceof Uint8Array ? chunk : await chunk.source.read(chunk.offset, chunk.length);
    output.set(bytes, offset);
    offset += bytes.length;
  }
  return output;
}

function chunkLength(chunk: WriteChunk): number {
  return chunk.length;
}
