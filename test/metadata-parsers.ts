import fs from 'node:fs';

import * as mm from '../lib/index.js';
import type { IAudioMetadata, IOptions } from '../lib/index.js';

type ParseFileMethod = (skipTest: () => void, filePath: string, mimeType?: string, options?: IOptions) => Promise<{metadata: IAudioMetadata, randomRead: boolean}>;

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
    initParser: async (skipTest, filePath: string, mimeType?: string, options?: IOptions) => {
      return {
        metadata: await mm.parseFile(filePath, options),
        randomRead: true
      };
    }
  }, {
    description: 'parseStream (Node.js)',
    initParser: async (skipTest, filePath: string, mimeType?: string, options?: IOptions) => {
      const stream = fs.createReadStream(filePath);
      try {
        return {
          metadata: await mm.parseStream(stream, {mimeType: mimeType}, options),
          randomRead: false
        };
      } finally {
        stream.close();
      }
    }
  }, {
    description: 'parseBlob',
    initParser: async (skipTest, filePath: string, mimeType?: string, options?: IOptions) => {
      if (nodeMajorVersion < 20) {
        skipTest();
      }
      const buffer = fs.readFileSync(filePath);
      return {
        metadata: await mm.parseBlob(new Blob([buffer], {type: mimeType}), options),
        randomRead: false
      };
    }
  }, {
    description: 'parseBuffer',
    initParser: async(skipTest, filePath: string, mimeType?: string, options?: IOptions) => {
      const buffer = fs.readFileSync(filePath);
      const array = new Uint8Array(buffer);
      return {
        metadata: await mm.parseBuffer(array, {mimeType}, options),
        randomRead: true
      };
    }
  }
];
