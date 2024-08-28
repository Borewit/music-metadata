import type { IParserLoader, ITokenParser } from '../ParserFactory.js';
import type { INativeMetadataCollector } from '../common/MetadataCollector.js';
import type { ITokenizer } from 'strtok3';
import type { IOptions } from '../type.js';

export const matroskaParserLoader: IParserLoader = {
  parserType: 'matroska',
  extensions: ['.mka', '.mkv', '.mk3d', '.mks', 'webm'],
  async load(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions): Promise<ITokenParser> {
    return new (await import('./MatroskaParser.js')).MatroskaParser(metadata, tokenizer, options);
  }
};
