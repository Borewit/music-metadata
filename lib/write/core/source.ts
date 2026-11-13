import { fromBuffer, fromFile } from 'strtok3';
import { type ByteSource, TokenizerSource } from './source.shared.js';

export type { ByteSource } from './source.shared.js';

/** Open a random-access source from a file path or an in-memory buffer. */
export async function openSource(input: string | Uint8Array): Promise<ByteSource> {
  const tokenizer = typeof input === 'string' ? await fromFile(input, { regularFileOnly: true }) : fromBuffer(input);
  return new TokenizerSource(tokenizer);
}
