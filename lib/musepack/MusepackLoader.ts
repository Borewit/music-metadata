import type { IParserLoader } from '../ParserFactory.js';

export const musepackParserLoader: IParserLoader = {
  parserType: 'musepack',
  extensions: ['.mpc'],
  mimeTypes: ['audio/musepack'],
  async load() {
    return (await import('./MusepackParser.js')).MusepackParser;
  }
};
