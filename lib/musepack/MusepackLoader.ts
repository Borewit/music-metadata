import type { IParserLoader, ITokenParser } from '../ParserFactory.js';
import type { INativeMetadataCollector } from '../common/MetadataCollector.js';
import type { ITokenizer } from 'strtok3';
import type { IOptions } from '../type.js';

export const musepackParserLoader: IParserLoader = {
  parserType: 'musepack',
  extensions: ['.mpc'],
  async load(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions): Promise<ITokenParser> {
    return new (await import('./MusepackParser.js')).MusepackParser(metadata, tokenizer, options);
  }
};
