import { createTokenizerView, EndOfStreamError, type ITokenizer, TokenizerBoundaryError } from 'strtok3';
import { validateAllocation } from '../common/Allocation.js';
import type { INativeMetadataCollector } from '../common/MetadataCollector.js';
import type { IOptions } from '../type.js';
import { Id3v2ContentError } from './FrameParser.js';
import { ID3v2Parser } from './ID3v2Parser.js';
import { ID3v2Header } from './ID3v2Token.js';

/** Borrow the chunk payload; consume its remainder while leaving container padding to the caller. */
export async function parseEmbeddedID3v2(
  metadata: INativeMetadataCollector,
  tokenizer: ITokenizer,
  options: IOptions,
  size: number
): Promise<void> {
  // Retain the metadata payload limit, including for caller-provided tokenizers.
  validateAllocation(size, options);
  if (
    size < ID3v2Header.len ||
    (tokenizer.fileInfo.size !== undefined && size > tokenizer.fileInfo.size - tokenizer.position)
  ) {
    throw new EndOfStreamError();
  }
  const embeddedTokenizer = createTokenizerView(tokenizer, size);
  try {
    await new ID3v2Parser().parse(metadata, embeddedTokenizer, options);
    await embeddedTokenizer.consumeRemainder();
  } catch (error) {
    if (error instanceof TokenizerBoundaryError) {
      throw new Id3v2ContentError(`Embedded ID3v2 read exceeds chunk boundary: ${error.message}`);
    }
    throw error;
  } finally {
    // Closing the borrowed view never closes the container's input.
    await embeddedTokenizer.close();
  }
}
