import type { IParserLoader } from '../ParserFactory.js';

export const matroskaParserLoader: IParserLoader = {
  parserType: 'matroska',
  extensions: ['.mka', '.mkv', '.mk3d', '.mks', 'webm'],
  mimeTypes: ['audio/matroska', 'video/matroska', 'audio/webm', 'video/webm'],
  async load() {
    return (await import('./MatroskaParser.js')).MatroskaParser
  }
};
