import { fromBuffer, type ITokenizer } from 'strtok3';
import { Uint8ArrayType } from 'token-types';
import { getTokenizerOptions, readToken } from '../common/Allocation.js';
import type { INativeMetadataCollector } from '../common/MetadataCollector.js';
import type { IOptions } from '../type.js';
import { ID3v2Parser } from './ID3v2Parser.js';

/** Buffer only the chunk payload; container boundaries and padding stay with the caller. */
export async function parseEmbeddedID3v2(
  metadata: INativeMetadataCollector,
  tokenizer: ITokenizer,
  options: IOptions,
  size: number
): Promise<void> {
  const data = await readToken(tokenizer, new Uint8ArrayType(size), options);
  const embeddedTokenizer = fromBuffer(data, getTokenizerOptions(options));
  await new ID3v2Parser().parse(metadata, embeddedTokenizer, options);
}
