import fs from 'node:fs';

import * as mm from '../lib/index.js';
import { IAudioMetadata, IOptions } from '../lib/index.js';

type ParseFileMethod = (skipTest: () => void, filePath: string, mimeType?: string, options?: IOptions) => Promise<IAudioMetadata>;

interface IParser {
  description: string;
  initParser: ParseFileMethod;
}

const [nodeMajorVersion] = process.versions.node.split('.').map(Number);

/**
 * Helps looping through different input styles
 */
export const Parsers: IParser[] = [
  {
    description: 'parseFile',
    initParser: (skipTest, filePath: string, mimeType?: string, options?: IOptions) => {
      return mm.parseFile(filePath, options);
    }
  }, {
    description: 'parseStream (Node.js)',
    initParser: (skipTest, filePath: string, mimeType?: string, options?: IOptions) => {
      const stream = fs.createReadStream(filePath);
      return mm.parseStream(stream, {mimeType}, options).then(metadata => {
        stream.close();
        return metadata;
      });
    }
  }, {
    description: 'parseBlob',
    initParser: (skipTest, filePath: string, mimeType?: string, options?: IOptions) => {
      if (nodeMajorVersion < 20) {
        skipTest();
      }
      const buffer = fs.readFileSync(filePath);
      return mm.parseBlob(new Blob([buffer], {type: mimeType}), options);
    }
  }, {
    description: 'parseBuffer',
    initParser: (skipTest, filePath: string, mimeType?: string, options?: IOptions) => {
      const buffer = fs.readFileSync(filePath);
      const array = new Uint8Array(buffer);
      return mm.parseBuffer(array, {mimeType}, options);
    }
  }
];
