import { ParserFactory } from "./ParserFactory";

import type { ITokenizer } from "./strtok3/types";
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
export function parseFromTokenizer(tokenizer: ITokenizer, options?: IOptions): Promise<IAudioMetadata> {
  return ParserFactory.parseOnContentType(tokenizer, options);
}
