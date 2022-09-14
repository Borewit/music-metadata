import { createReadStream, readFileSync } from "node:fs";

import { parseFile, parseStream, parseBuffer } from "../lib";

import type { IAudioMetadata, IOptions } from "../lib/type";

type Parser = [
  description: "file" | "stream" | "buffer",
  initParser: (filePath: string, mimeType?: string, options?: IOptions) => Promise<IAudioMetadata>
];

/**
 * Helps looping through different input styles
 * @param filePath
 * @param mimeType
 * @param options
 * @returns
 */
export const Parsers: Parser[] = [
  [
    "file",
    (filePath, mimeType, options) => {
      return parseFile(filePath, options);
    },
  ],
  [
    "stream",
    async (filePath, mimeType, options) => {
      const stream = createReadStream(filePath);
      const metadata = await parseStream(stream, { mimeType }, options);
      stream.close();
      return metadata;
    },
  ],
  [
    "buffer",
    (filePath, mimeType, options) => {
      const buffer = readFileSync(filePath);
      const array = new Uint8Array(buffer);
      return parseBuffer(array, { mimeType }, options);
    },
  ],
];
