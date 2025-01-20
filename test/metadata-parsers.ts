import fs from 'node:fs';

import * as mm from '../lib/index.js';
import type { IAudioMetadata, IOptions } from '../lib/index.js';
import { makeByteReadableStreamFromFile } from './util.js';

type ParseFileMethod = (skipTest: () => void, filePath: string, mimeType?: string, options?: IOptions) => Promise<IAudioMetadata>;

interface IParser {
  description: string;
  webStream?: true;
  randomRead?: true
  initParser: ParseFileMethod;
}

const [nodeMajorVersion] = process.versions.node.split('.').map(Number);

/**
 * Helps to loop through different input styles
 */
export const Parsers: IParser[] = [
  {
    description: 'parseFile',
    randomRead: true,
    initParser: (skipTest, filePath: string, mimeType?: string, options?: IOptions) => {
      return mm.parseFile(filePath, options);
    }
  }, {
    description: 'parseStream (Node.js)',
    initParser: async (skipTest, filePath: string, mimeType?: string, options?: IOptions) => {
      const nodeStream = fs.createReadStream(filePath);
      try {
        return await mm.parseStream(nodeStream, {mimeType: mimeType}, options);
      } finally {
        nodeStream.close();
      }
    }
  }, {
    description: 'parseWebStream',
    webStream: true,
    initParser: async (skipTest, filePath: string, mimeType?: string, options?: IOptions) => {
      const webStream = await makeByteReadableStreamFromFile(filePath);
      try {
        return await mm.parseWebStream(webStream.stream, {mimeType: mimeType, size: webStream.fileSize}, options);
      } finally {
        await webStream.stream.cancel()
        await webStream.closeFile();
      }
    }
  }, {
    description: 'parseBlob',
    webStream: true,
    initParser: (skipTest, filePath: string, mimeType?: string, options?: IOptions) => {
      if (nodeMajorVersion < 20) {
        skipTest();
      }
      const buffer = fs.readFileSync(filePath);
      return mm.parseBlob(new Blob([buffer], {type: mimeType}), options);
    }
  }, {
    description: 'parseBuffer',
    randomRead: true,
    initParser: (skipTest, filePath: string, mimeType?: string, options?: IOptions) => {
      const buffer = fs.readFileSync(filePath);
      const array = new Uint8Array(buffer);
      return mm.parseBuffer(array, {mimeType}, options);
    }
  }
];
