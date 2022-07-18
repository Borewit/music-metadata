import * as strtok3 from "../strtok3";
import type { Readable as ReadableStream } from "node:stream";
import type { FileTypeResult } from "./type";
import { fileTypeFromTokenizer } from "./fileTypeFromTokenizer";

/**
 * Detect the file type of a Node.js [readable stream](https://nodejs.org/api/stream.html#stream_class_stream_readable).
 *
 * The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.
 * @param stream - A readable stream representing file data.
 * @returns The detected file type and MIME type, or `undefined` when there is no match.
 */
export async function fileTypeFromStream(stream: ReadableStream): Promise<FileTypeResult | undefined> {
  const tokenizer = await strtok3.fromStream(stream);
  try {
    return await fileTypeFromTokenizer(tokenizer);
  } finally {
    await tokenizer.close();
  }
}
