import type { IParserLoader, ITokenParser } from '../ParserFactory.js';
import type { INativeMetadataCollector } from '../common/MetadataCollector.js';
import type { ITokenizer } from 'strtok3';
import type { IOptions } from '../type.js';

export const dsfParserLoader: IParserLoader = {
  parserType: 'dsf',
  extensions: ['.dsf'],
  async load(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions): Promise<ITokenParser> {
    return new (await import('./DsfParser.js')).DsfParser(metadata, tokenizer, options);
  }
};
