import { BufferTokenizer } from "./BufferTokenizer";
import { IFileInfo } from "./types";

/**
 * Construct ReadStreamTokenizer from given Buffer.
 * @param uint8Array - Uint8Array to tokenize
 * @param fileInfo - Pass additional file information to the tokenizer
 * @returns BufferTokenizer
 */

export function fromBuffer(
  uint8Array: Uint8Array,
  fileInfo?: IFileInfo
): BufferTokenizer {
  return new BufferTokenizer(uint8Array, fileInfo);
}
