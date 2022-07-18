import * as strtok3 from "./strtok3";
import type { IAudioMetadata, IOptions } from "./type";
import { RandomUint8ArrayReader } from "./common/RandomUint8ArrayReader";
import { scanAppendingHeaders } from "./scanAppendingHeaders";
import { parseFromTokenizer } from "./parseFromTokenizer";

/**
 * Parse audio from Node Buffer
 * @param uint8Array - Uint8Array holding audio data
 * @param fileInfo - File information object or MIME-type string
 * @param options - Parsing options
 * @returns Metadata
 * Ref: https://github.com/Borewit/strtok3/blob/e6938c81ff685074d5eb3064a11c0b03ca934c1d/src/index.ts#L15
 */
export async function parseBuffer(
  uint8Array: Uint8Array,
  fileInfo?: strtok3.IFileInfo | string,
  options: IOptions = {}
): Promise<IAudioMetadata> {
  const bufferReader = new RandomUint8ArrayReader(uint8Array);
  await scanAppendingHeaders(bufferReader, options);

  const tokenizer = strtok3.fromBuffer(uint8Array, typeof fileInfo === "string" ? { mimeType: fileInfo } : fileInfo);
  return parseFromTokenizer(tokenizer, options);
}
