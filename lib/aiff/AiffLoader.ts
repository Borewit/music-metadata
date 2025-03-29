import type { IParserLoader } from '../ParserFactory.js';

export const aiffParserLoader: IParserLoader = {
  parserType: 'aiff',
  extensions: ['.aif', 'aiff', 'aifc'],
  async load() {
    return (await import('./AiffParser.js')).AIFFParser;
  }
};
