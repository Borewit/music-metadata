import type { IParserLoader, ITokenParser } from '../ParserFactory.js';
import type { INativeMetadataCollector } from '../common/MetadataCollector.js';
import type { ITokenizer } from 'strtok3';
import type { IOptions } from '../type.js';

export const mpegParserLoader: IParserLoader = {
  parserType: 'mpeg',
  extensions: ['.mp2', '.mp3', '.m2a', '.aac', 'aacp'],
  async load(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions): Promise<ITokenParser> {
    return new (await import('./MpegParser.js')).MpegParser(metadata, tokenizer, options);
  }
};
