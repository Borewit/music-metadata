import type { IParserLoader } from '../ParserFactory.js';

export const wavpackParserLoader: IParserLoader = {
  parserType: 'wavpack',
  extensions: ['.wv', '.wvp'],
  mimeTypes: ['audio/wavpack'],
  async load() {
    return (await import('./WavPackParser.js')).WavPackParser;
  }
};
