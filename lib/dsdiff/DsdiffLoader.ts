import type { IParserLoader } from '../ParserFactory.js';

export const dsdiffParserLoader: IParserLoader = {
  parserType: 'dsdiff',
  extensions: ['.dff'],
  mimeTypes: ['audio/dsf', 'audio/dsd'],
  async load() {
    return (await import('./DsdiffParser.js')).DsdiffParser
  }
};
