import fs from 'node:fs';

import * as mm from '../lib/index.js';
import type { IAudioMetadata, IOptions } from '../lib/index.js';
import { makeReadableByteFileStream } from './util.js';

type ParseFileMethod = (skipTest: () => void, filePath: string, mimeType?: string, options?: IOptions) => Promise<{metadata: IAudioMetadata, randomRead: boolean}>;

interface IParser {
  description: string;
  webStream?: true;
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
      const nodeStream = fs.createReadStream(filePath);
      try {
        return {
          metadata: await mm.parseStream(nodeStream, {mimeType: mimeType}, options),
          randomRead: false
        };
      } finally {
        nodeStream.close();
      }
    }
  }, {
    description: 'parseWebStream',
    webStream: true,
    initParser: async (skipTest, filePath: string, mimeType?: string, options?: IOptions) => {
      const webStream = await makeReadableByteFileStream(filePath);
      try {
        return {
          // ToDo: add unit tests, where the fileSize is not provided (passed)
          metadata: await mm.parseWebStream(webStream.stream, {mimeType: mimeType, size: webStream.fileSize}, options),
          randomRead: false,
        };
      } finally {
        await webStream.stream.cancel()
        await webStream.closeFile();
      }
    }
  }, {
    description: 'parseBlob',
    webStream: true,
    initParser: async (skipTest, filePath: string, mimeType?: string, options?: IOptions) => {
      if (nodeMajorVersion < 20) {
        skipTest();
      }
      const buffer = fs.readFileSync(filePath);
      return {
        metadata: await mm.parseBlob(new Blob([buffer], {type: mimeType}), options),
        randomRead: false,
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
