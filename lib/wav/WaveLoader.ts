import type { IParserLoader } from '../ParserFactory.js';

export const riffParserLoader: IParserLoader = {
  parserType: 'riff',
  extensions: ['.wav', 'wave', '.bwf'],
  async load() {
    return (await import('./WaveParser.js')).WaveParser
  }
};
