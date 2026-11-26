import type { ITokenizer } from 'strtok3';
import type { INativeMetadataCollector } from '../common/MetadataCollector.js';
import type { IParserLoader } from '../ParserFactory.js';
import type { IOptions } from '../type.js';

export const id3v2TagLoader = {
  parserType: 'id3v2',
  leadingHeader: true,
  extensions: [],
  mimeTypes: [],
  async load() {
    return (await import('./ID3v2Parser.js')).ID3v2Parser;
  }
} satisfies IParserLoader;

export async function parseID3v2(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions) {
  const Parser = await id3v2TagLoader.load();
  await new Parser(metadata, tokenizer, options).parse();
}
