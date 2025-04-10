import type { IParserLoader } from '../ParserFactory.js';

export const aiffParserLoader: IParserLoader = {
  parserType: 'aiff',
  extensions: ['.aif', 'aiff', 'aifc'],
  mimeTypes: ['audio/aiff', 'audio/aif', 'audio/aifc', 'application/aiff'],

  async load() {
    return (await import('./AiffParser.js')).AIFFParser;
  }

};
