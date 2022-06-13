import * as strtok3 from "./strtok3";

import * as scanAppendingHeaders from "./scanAppendingHeaders";
import { ParserFactory } from "./ParserFactory";
import { IAudioMetadata, IOptions } from "./type";
import { RandomFileReader } from "./common/RandomFileReader";

/**
 * Parse audio from Node file
 * @param filePath - Media file to read meta-data from
 * @param options - Parsing options
 * @returns Metadata
 */
export async function parseFile(
  filePath: string,
  options: IOptions = {}
): Promise<IAudioMetadata> {
  const fileTokenizer = await strtok3.fromFile(filePath);

  const fileReader = await RandomFileReader.init(
    filePath,
    fileTokenizer.fileInfo.size
  );
  try {
    await scanAppendingHeaders.scanAppendingHeaders(fileReader, options);
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
