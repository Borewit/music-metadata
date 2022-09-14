import { RandomFileReader } from "./common/RandomFileReader";
import { ParserFactory } from "./ParserFactory";
import { scanAppendingHeaders } from "./scanAppendingHeaders";
import { fromFile } from "./strtok3";

import type { IAudioMetadata, IOptions } from "./type";

/**
 * Parse audio from Node file
 * @param filePath - Media file to read meta-data from
 * @param options - Parsing options
 * @returns Metadata
 */
export async function parseFile(filePath: string, options: IOptions = {}): Promise<IAudioMetadata> {
  const fileTokenizer = await fromFile(filePath);

  const fileReader = await RandomFileReader.init(filePath, fileTokenizer.fileInfo.size);
  try {
    await scanAppendingHeaders(fileReader, options);
  } finally {
    await fileReader.close();
  }

  try {
    const parserName = ParserFactory.getParserIdForExtension(filePath);

    return await ParserFactory.parse(fileTokenizer, parserName, options);
  } finally {
    await fileTokenizer.close();
  }
}
