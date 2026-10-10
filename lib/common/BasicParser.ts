import type { IGetToken } from '@tokenizer/token';
import type { ITokenizer } from 'strtok3';

import type { ITokenParser } from '../ParserFactory.js';
import type { IOptions } from '../type.js';
import { getMaxMemoryAllocation, readToken } from './Allocation.js';
import type { INativeMetadataCollector } from './MetadataCollector.js';

export abstract class BasicParser implements ITokenParser {
  protected readonly metadata: INativeMetadataCollector;

  protected readonly tokenizer: ITokenizer;

  protected readonly options: IOptions;

  /**
   * Initialize parser with output (metadata), input (tokenizer) & parsing options (options).
   * @param {INativeMetadataCollector} metadata Output
   * @param {ITokenizer} tokenizer Input
   * @param {IOptions} options Parsing options
   */
  constructor(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions) {
    getMaxMemoryAllocation(options);
    this.metadata = metadata;
    this.tokenizer = tokenizer;
    this.options = options;
  }

  protected readToken<T>(token: IGetToken<T>, position?: number): Promise<T> {
    return readToken(this.tokenizer, token, this.options, position);
  }

  public abstract parse(): Promise<void>;
}
