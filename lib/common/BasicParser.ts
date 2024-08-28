import type { ITokenizer } from 'strtok3';

import type { ITokenParser } from '../ParserFactory.js';
import type { IOptions, } from '../type.js';
import type { INativeMetadataCollector } from './MetadataCollector.js';

export abstract class BasicParser implements ITokenParser {

  /**
   * Initialize parser with output (metadata), input (tokenizer) & parsing options (options).
   * @param {INativeMetadataCollector} metadata Output
   * @param {ITokenizer} tokenizer Input
   * @param {IOptions} options Parsing options
   */
  constructor(
    protected readonly metadata: INativeMetadataCollector,
    protected readonly tokenizer: ITokenizer,
    protected readonly options: IOptions
  ) {
  }

  public abstract parse(): Promise<void>;
}
