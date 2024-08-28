import type { IParserLoader, ITokenParser } from '../ParserFactory.js';
import type { INativeMetadataCollector } from '../common/MetadataCollector.js';
import type { ITokenizer } from 'strtok3';
import type { IOptions } from '../type.js';

export const apeParserLoader: IParserLoader = {
  parserType: 'apev2',
  extensions: ['.ape'],
  async load(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions): Promise<ITokenParser> {
    return new (await import('./APEv2Parser.js')).APEv2Parser(metadata, tokenizer, options);
  }
};
