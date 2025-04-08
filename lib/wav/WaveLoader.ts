import type { IParserLoader } from '../ParserFactory.js';

export const riffParserLoader: IParserLoader = {
  parserType: 'riff',
  extensions: ['.wav', 'wave', '.bwf'],
  mimeTypes: ['audio/vnd.wave', 'audio/wav', 'audio/wave'],
  async load() {
    return (await import('./WaveParser.js')).WaveParser
  }
};
