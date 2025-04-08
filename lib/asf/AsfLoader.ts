import type { IParserLoader } from '../ParserFactory.js';

export const asfParserLoader: IParserLoader = {
  parserType: 'asf',
  extensions: ['.asf'],
  mimeTypes: ['audio/ms-wma', 'video/ms-wmv', 'audio/ms-asf', 'video/ms-asf', 'application/vnd.ms-asf'],
  async load() {
    return (await import('./AsfParser.js')).AsfParser;
  }
};
