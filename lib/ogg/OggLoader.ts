import type { IParserLoader, } from '../ParserFactory.js';

export const oggParserLoader: IParserLoader = {
  parserType: 'ogg',
  extensions: ['.ogg', '.ogv', '.oga', '.ogm', '.ogx', '.opus', '.spx'],
  async load() {
    return (await import('./OggParser.js')).OggParser
  }
};
