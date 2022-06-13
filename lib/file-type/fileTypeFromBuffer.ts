import * as strtok3 from "../strtok3";
import { FileTypeResult } from "./type";
import { fileTypeFromTokenizer } from "./fileTypeFromTokenizer";

/**
 * Detect the file type of a `Buffer`, `Uint8Array`, or `ArrayBuffer`.
 *
 * The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.
 *
 * If file access is available, it is recommended to use `.fromFile()` instead.
 * @param buffer - An Uint8Array or Buffer representing file data. It works best if the buffer contains the entire file, it may work with a smaller portion as well.
 * @returns The detected file type and MIME type, or `undefined` when there is no match.
 */
export async function fileTypeFromBuffer(
  input: Uint8Array | ArrayBuffer
): Promise<FileTypeResult | undefined> {
  if (!(input instanceof Uint8Array || input instanceof ArrayBuffer)) {
    throw new TypeError(
      `Expected the \`input\` argument to be of type \`Uint8Array\` or \`Buffer\` or \`ArrayBuffer\`, got \`${typeof input}\``
    );
  }

  const buffer = input instanceof Uint8Array ? input : new Uint8Array(input);

  if (!(buffer && buffer.length > 1)) {
    return;
  }

  return fileTypeFromTokenizer(strtok3.fromBuffer(buffer));
}
