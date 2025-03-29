import type { IParserLoader } from '../ParserFactory.js';

export const mp4ParserLoader: IParserLoader = {
  parserType: 'mp4',
  extensions: ['.mp4', '.m4a', '.m4b', '.m4pa', 'm4v', 'm4r', '3gp'],
  async load() {
    return (await import('./MP4Parser.js')).MP4Parser
  }
};
