import type { ITokenizer } from 'strtok3';

import { ITokenParser } from '../ParserFactory.js';
import { IOptions, IPrivateOptions } from '../type.js';
import { INativeMetadataCollector } from './MetadataCollector.js';

export abstract class BasicParser implements ITokenParser {

  protected metadata: INativeMetadataCollector;
  protected tokenizer: ITokenizer;
  protected options: IPrivateOptions;

  /**
   * Initialize parser with output (metadata), input (tokenizer) & parsing options (options).
   * @param {INativeMetadataCollector} metadata Output
   * @param {ITokenizer} tokenizer Input
   * @param {IOptions} options Parsing options
   */
  public init(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions): ITokenParser {

    this.metadata = metadata;
    this.tokenizer = tokenizer;
    this.options = options;

    return this;
  }

  public abstract parse();

}
