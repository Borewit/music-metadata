import { BufferTokenizer } from "./BufferTokenizer";
import type { IFileInfo } from "./types";

/**
 * Construct ReadStreamTokenizer from given Buffer.
 * @param uint8Array - Uint8Array to tokenize
 * @param fileInfo - Pass additional file information to the tokenizer
 * @returns BufferTokenizer
 */

/**
 *
 * @param uint8Array
 * @param fileInfo
 * @returns
 */
export function fromBuffer(uint8Array: Uint8Array, fileInfo?: IFileInfo): BufferTokenizer {
  return new BufferTokenizer(uint8Array, fileInfo);
}
