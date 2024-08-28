import type { IParserLoader, ITokenParser } from '../ParserFactory.js';
import type { INativeMetadataCollector } from '../common/MetadataCollector.js';
import type { ITokenizer } from 'strtok3';
import type { IOptions } from '../type.js';

export const dsdiffParserLoader: IParserLoader = {
  parserType: 'dsdiff',
  extensions: ['.dff'],
  async load(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions): Promise<ITokenParser> {
    return new (await import('./DsdiffParser.js')).DsdiffParser(metadata, tokenizer, options);
  }
};
