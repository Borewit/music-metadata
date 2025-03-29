import type { IParserLoader } from '../ParserFactory.js';

export const dsdiffParserLoader: IParserLoader = {
  parserType: 'dsdiff',
  extensions: ['.dff'],
  async load() {
    return (await import('./DsdiffParser.js')).DsdiffParser
  }
};
