import { parseFromTokenizer as parseFromTokenizer_parseFromTokenizer } from "./parseFromTokenizer";
import { fromStream } from "./strtok3/fromStream";

import type { IFileInfo } from "./strtok3/types";
import type { IAudioMetadata, IOptions } from "./type";
import type * as Stream from "node:stream";

/**
 * Parse audio from Node Stream.Readable
 * @param stream - Stream to read the audio track from
 * @param fileInfo - File information object or MIME-type, e.g.: 'audio/mpeg'
 * @param options - Parsing options
 * @returns Metadata
 */
export async function parseStream(
  stream: Stream.Readable,
  fileInfo?: IFileInfo | string,
  options: IOptions = {}
): Promise<IAudioMetadata> {
  const tokenizer = await fromStream(stream, typeof fileInfo === "string" ? { mimeType: fileInfo } : fileInfo);
  return parseFromTokenizer_parseFromTokenizer(tokenizer, options);
}
