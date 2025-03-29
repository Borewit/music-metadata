import type { IParserLoader } from '../ParserFactory.js';

export const asfParserLoader: IParserLoader = {
  parserType: 'asf',
  extensions: ['.asf'],
  async load() {
    return (await import('./AsfParser.js')).AsfParser;
  }
};
