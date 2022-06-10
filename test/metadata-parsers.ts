import * as fs from "fs";

import * as mm from "../lib";
import { IAudioMetadata, IOptions } from "../lib/type";

type ParseFileMethod = (
  filePath: string,
  mimeType?: string,
  options?: IOptions
) => Promise<IAudioMetadata>;

interface IParser {
  description: string;
  initParser: ParseFileMethod;
}

/**
 * Helps looping through different input styles
 */
export const Parsers: IParser[] = [
  {
    description: "parseFile",
    initParser: (filePath: string, mimeType?: string, options?: IOptions) => {
      return mm.parseFile(filePath, options);
    },
  },
  {
    description: "parseStream",
    initParser: (filePath: string, mimeType?: string, options?: IOptions) => {
      const stream = fs.createReadStream(filePath);
      return mm.parseStream(stream, { mimeType }, options).then((metadata) => {
        stream.close();
        return metadata;
      });
    },
  },
  {
    description: "parseBuffer",
    initParser: (filePath: string, mimeType?: string, options?: IOptions) => {
      const buffer = fs.readFileSync(filePath);
      const array = new Uint8Array(buffer);
      return mm.parseBuffer(array, { mimeType }, options);
    },
  },
];
