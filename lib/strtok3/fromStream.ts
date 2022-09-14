import { stat as fs_stat } from "node:fs/promises";

import { ReadStreamTokenizer } from "./ReadStreamTokenizer";

import type { IFileInfo } from "./types";
import type { PathLike } from "node:fs";
import type { Readable } from "node:stream";

/**
 * Construct ReadStreamTokenizer from given Stream.
 * Will set fileSize, if provided given Stream has set the .path property
 * @param stream - Read from Node.js Stream.Readable
 * @param fileInfo - Pass the file information, like size and MIME-type of the corresponding stream.
 * @returns ReadStreamTokenizer
 */
export async function fromStream(
  stream: Readable & { path?: PathLike },
  fileInfo?: IFileInfo
): Promise<ReadStreamTokenizer> {
  fileInfo = fileInfo ?? {};
  if (stream.path) {
    const stat = await fs_stat(stream.path);
    fileInfo.path = stream.path.toString();
    fileInfo.size = stat.size;
  }
  return new ReadStreamTokenizer(stream, fileInfo);
}
