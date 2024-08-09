import type { ITokenizer } from 'strtok3';

import type { ITokenParser } from '../ParserFactory.js';
import type { IOptions, IPrivateOptions } from '../type.js';
import type { INativeMetadataCollector } from './MetadataCollector.js';

export abstract class BasicParser implements ITokenParser {

  protected metadata: INativeMetadataCollector = undefined as unknown as INativeMetadataCollector;
  protected tokenizer: ITokenizer = undefined as unknown as ITokenizer;
  protected options: IPrivateOptions = undefined as unknown as IPrivateOptions;

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

  public abstract parse(): Promise<void>;

}
