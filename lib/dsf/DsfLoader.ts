import type { IParserLoader } from '../ParserFactory.js';

export const dsfParserLoader: IParserLoader = {
  parserType: 'dsf',
  extensions: ['.dsf'],
  async load() {
    return (await import('./DsfParser.js')).DsfParser
  }
};
