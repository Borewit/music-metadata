import { Readable } from "stream";
import * as fs from "./FsPromise";
import { ReadStreamTokenizer } from "./ReadStreamTokenizer";
import * as core from "./core";

export { fromFile } from "./FileTokenizer";
export { ITokenizer, EndOfStreamError, fromBuffer, IFileInfo } from "./core";
export { IToken, IGetToken } from "../token-types";

/**
 * Construct ReadStreamTokenizer from given Stream.
 * Will set fileSize, if provided given Stream has set the .path property.
 * @param stream - Node.js Stream.Readable
 * @param fileInfo - Pass additional file information to the tokenizer
 * @returns Tokenizer
 */
export async function fromStream(
  stream: Readable,
  fileInfo?: core.IFileInfo
): Promise<ReadStreamTokenizer> {
  fileInfo = fileInfo ? fileInfo : {};
  if ((stream as any).path) {
    const stat = await fs.stat((stream as any).path);
    fileInfo.path = (stream as any).path;
    fileInfo.size = stat.size;
  }
  return core.fromStream(stream, fileInfo);
}
