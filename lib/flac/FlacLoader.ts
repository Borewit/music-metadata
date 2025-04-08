import type { IParserLoader } from '../ParserFactory.js';

export const flacParserLoader: IParserLoader = {
  parserType: 'flac',
  extensions: ['.flac'],
  mimeTypes: ['audio/flac'],
  async load() {
    return (await import('./FlacParser.js')).FlacParser
  }
};
