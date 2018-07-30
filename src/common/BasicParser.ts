import {ITokenParser} from "../ParserFactory";
import {IOptions} from "../index";
import {IMetadataCollector} from "./MetadataCollector";
import {ITokenizer} from "strtok3";

export abstract class BasicParser implements ITokenParser {

  protected metadata: IMetadataCollector;
  protected tokenizer: ITokenizer;
  protected options: IOptions;

  protected warnings: string[] = []; // ToDo: make these part of the parsing result

  /**
   * Initialize parser with output (metadata), input (tokenizer) & parsing options (options).
   * @param {IMetadataCollector} metadata Output
   * @param {ITokenizer} tokenizer Input
   * @param {IOptions} options Parsing options
   */
  public init(metadata: IMetadataCollector, tokenizer: ITokenizer, options: IOptions): ITokenParser {

    this.metadata = metadata;
    this.tokenizer = tokenizer;
    this.options = options;

    return this;
  }

  public abstract parse();

}