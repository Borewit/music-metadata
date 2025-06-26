import fs from 'node:fs';

import * as mm from '../lib/index.js';
import type { IAudioMetadata, IOptions } from '../lib/index.js';
import { makeByteReadableStreamFromFile, makeDefaultReadableStreamFromFile } from './util.js';

type ParseFileMethod = (skipTest: () => void, filePath: string, mimeType?: string, options?: IOptions) => Promise<IAudioMetadata>;

interface IParser {
  description: string;
  randomRead?: true
  parse: ParseFileMethod;
}

const [nodeMajorVersion] = process.versions.node.split('.').map(Number);

/**
 * Helps to loop through different input styles
 */
export const Parsers: IParser[] = [
  {
    description: 'parseFile',
    randomRead: true,
    parse: (_skipTest, filePath: string, _mimeType?: string, options?: IOptions) => {
      return mm.parseFile(filePath, options);
    }
  }, {
    description: 'parseStream (Node.js)',
    parse: async (_skipTest, filePath: string, mimeType?: string, options?: IOptions) => {
      const nodeStream = fs.createReadStream(filePath);
      try {
        return await mm.parseStream(nodeStream, {mimeType: mimeType}, options);
      } finally {
        nodeStream.close();
      }
    }
  }, {
    description: 'parseWebStream from byte ReadableStream',
    parse: async (_skipTest, filePath: string, mimeType?: string, options?: IOptions) => {
      const webStream = await makeByteReadableStreamFromFile(filePath);
      try {
        return await mm.parseWebStream(webStream.stream, {mimeType: mimeType, size: webStream.fileSize}, options);
      } finally {
        await webStream.stream.cancel();
      }
    }
  }, {
    description: 'parseWebStream from default ReadableStream',
    parse: async (_skipTest, filePath: string, mimeType?: string, options?: IOptions) => {
      const webStream = await makeDefaultReadableStreamFromFile(filePath);
      try {
        return await mm.parseWebStream(webStream.stream, {mimeType: mimeType, size: webStream.fileSize}, options);
      } finally {
        await webStream.stream.cancel();
      }
    }
  }, {
    description: 'parseBlob',
    parse: async (skipTest, filePath: string, mimeType?: string, options?: IOptions) => {
      if (nodeMajorVersion < 20) {
        skipTest();
      }
      const blob = await fs.openAsBlob(filePath, {type: mimeType});
      return mm.parseBlob(blob, options);
    }
  }, {
    description: 'parseBuffer',
    randomRead: true,
    parse: (_skipTest, filePath: string, mimeType?: string, options?: IOptions) => {
      const buffer = fs.readFileSync(filePath);
      const array = new Uint8Array(buffer);
      return mm.parseBuffer(array, {mimeType}, options);
    }
  }
];
