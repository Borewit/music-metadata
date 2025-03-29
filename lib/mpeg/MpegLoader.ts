import type { IParserLoader } from '../ParserFactory.js';

export const mpegParserLoader: IParserLoader = {
  parserType: 'mpeg',
  extensions: ['.mp2', '.mp3', '.m2a', '.aac', 'aacp'],
  async load() {
    return (await import('./MpegParser.js')).MpegParser;
  }
};
