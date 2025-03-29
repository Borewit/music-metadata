import type { IParserLoader } from '../ParserFactory.js';

export const musepackParserLoader: IParserLoader = {
  parserType: 'musepack',
  extensions: ['.mpc'],
  async load() {
    return (await import('./MusepackParser.js')).MusepackParser;
  }
};
