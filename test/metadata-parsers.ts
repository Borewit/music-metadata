import { createReadStream, readFileSync } from "node:fs";

import { parseFile, parseStream, parseBuffer } from "../lib";
import { IAudioMetadata, IOptions } from "../lib/type";

interface Parser {
  description: string;
  initParser: (
    filePath: string,
    mimeType?: string,
    options?: IOptions
  ) => Promise<IAudioMetadata>;
}

/**
 * Helps looping through different input styles
 */
export const Parsers: Parser[] = [
  {
    description: "parseFile",
    initParser: (filePath, mimeType, options) => {
      return parseFile(filePath, options);
    },
  },
  {
    description: "parseStream",
    initParser: async (filePath, mimeType, options) => {
      const stream = createReadStream(filePath);
      const metadata = await parseStream(stream, { mimeType }, options);
      stream.close();
      return metadata;
    },
  },
  {
    description: "parseBuffer",
    initParser: (filePath, mimeType, options) => {
      const buffer = readFileSync(filePath);
      const array = new Uint8Array(buffer);
      return parseBuffer(array, { mimeType }, options);
    },
  },
];
