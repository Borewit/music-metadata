import * as fs from 'fs-extra';
import * as mm from '../src';

type ParseFileMethod = (filePath: string, mimeType?: string, options?: mm.IOptions) => Promise<mm.IAudioMetadata>;

interface IParser {
  description: string;
  initParser: ParseFileMethod;
}

/**
 * Helps looping through different input styles
 */
export const Parsers: IParser[] = [
  {
    description: 'parseFile',
    initParser: (filePath: string, mimeType?: string, options?: mm.IOptions) => {
      return mm.parseFile(filePath, options);
    }
  }, {
    description: 'parseStream',
    initParser: (filePath: string, mimeType?: string, options?: mm.IOptions) => {
      const stream = fs.createReadStream(filePath);
      return mm.parseStream(stream, mimeType, options);
    }
  }, {
    description: 'parseBuffer',
    initParser: (filePath: string, mimeType?: string, options?: mm.IOptions) => {
      const buffer = fs.readFileSync(filePath);
      return mm.parseBuffer(buffer, mimeType, options);
    }
  }
];
