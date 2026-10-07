import type { IParserLoader } from '../ParserFactory.js';

export const cafParserLoader: IParserLoader = {
  parserType: 'caf',
  extensions: ['.caf', '.caff'],
  mimeTypes: ['audio/caf', 'application/caf'],

  async load() {
    return (await import('./CafParser.js')).CafParser;
  }
};
