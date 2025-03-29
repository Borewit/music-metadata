import type { IParserLoader } from '../ParserFactory.js';

export const apeParserLoader: IParserLoader = {
  parserType: 'apev2',
  extensions: ['.ape'],
  async load() {
    return (await import('./APEv2Parser.js')).APEv2Parser
  }
};
