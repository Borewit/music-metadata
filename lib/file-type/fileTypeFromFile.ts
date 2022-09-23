import { fromFile } from "../strtok3/fromFile";

import { fileTypeFromTokenizer } from "./fileTypeFromTokenizer";

import type { FileTypeResult } from "./type";

/**
 * Detect the file type of a file path.
 *
 * The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.
 * @param path - The file path to parse.
 * @returns The detected file type and MIME type or `undefined` when there is no match.
 */

/**
 *
 * @param path
 */
export async function fileTypeFromFile(path: string): Promise<FileTypeResult | undefined> {
  const tokenizer = await fromFile(path);
  try {
    return await fileTypeFromTokenizer(tokenizer);
  } finally {
    await tokenizer.close();
  }
}
