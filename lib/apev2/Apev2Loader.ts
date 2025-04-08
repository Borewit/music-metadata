import type { IParserLoader } from '../ParserFactory.js';

export const apeParserLoader: IParserLoader = {
  parserType: 'apev2',
  extensions: ['.ape'],
  mimeTypes: ['audio/ape', 'audio/monkeys-audio'],
  async load() {
    return (await import('./APEv2Parser.js')).APEv2Parser
  }
};
