import { ParserFactory } from "./ParserFactory";

import type * as strtok3 from "./strtok3";
import type { IAudioMetadata, IOptions } from "./type";

/**
 * Parse audio from ITokenizer source
 * @param tokenizer - Audio source implementing the tokenizer interface
 * @param options - Parsing options
 * @returns Metadata
 */

/**
 *
 * @param tokenizer
 * @param options
 * @returns
 */
export function parseFromTokenizer(tokenizer: strtok3.ITokenizer, options?: IOptions): Promise<IAudioMetadata> {
  return ParserFactory.parseOnContentType(tokenizer, options);
}
