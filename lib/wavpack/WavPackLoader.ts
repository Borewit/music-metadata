import type { IParserLoader } from '../ParserFactory.js';

export const wavpackParserLoader: IParserLoader = {
  parserType: 'wavpack',
  extensions: ['.wv', '.wvp'],
  async load() {
    return (await import('./WavPackParser.js')).WavPackParser;
  }
};
