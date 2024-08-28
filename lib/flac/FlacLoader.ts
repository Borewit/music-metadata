import type { IParserLoader, ITokenParser } from '../ParserFactory.js';
import type { INativeMetadataCollector } from '../common/MetadataCollector.js';
import type { ITokenizer } from 'strtok3';
import type { IOptions } from '../type.js';

export const flacParserLoader: IParserLoader = {
  parserType: 'flac',
  extensions: ['.flac'],
  async load(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions): Promise<ITokenParser> {
    return new (await import('./FlacParser.js')).FlacParser(metadata, tokenizer, options);
  }
};
