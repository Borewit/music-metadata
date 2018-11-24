import {ITokenizer} from 'strtok3/lib/type';
import {ITokenParser} from '../ParserFactory';
import {IOptions} from '../type';
import {INativeMetadataCollector} from './MetadataCollector';

export abstract class BasicParser implements ITokenParser {

  protected metadata: INativeMetadataCollector;
  protected tokenizer: ITokenizer;
  protected options: IOptions;

  protected warnings: string[] = []; // ToDo: make these part of the parsing result

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

  public abstract async parse();

}
