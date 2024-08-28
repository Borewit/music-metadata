import type { IParserLoader, ITokenParser } from '../ParserFactory.js';
import type { INativeMetadataCollector } from '../common/MetadataCollector.js';
import type { ITokenizer } from 'strtok3';
import type { IOptions } from '../type.js';

export const aiffParserLoader: IParserLoader = {
  parserType: 'aiff',
  extensions: ['.aif', 'aiff', 'aifc'],
  async load(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions): Promise<ITokenParser> {
    return new (await import('./AiffParser.js')).AIFFParser(metadata, tokenizer, options);
  }
};
