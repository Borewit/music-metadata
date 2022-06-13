import * as strtok3 from "../strtok3";
import { ITokenizer } from "../strtok3";
import { FileTypeResult } from "./type";
import { FileTypeParser } from "./FileTypeParser";

/**
 * Detect the file type from an [`ITokenizer`](https://github.com/Borewit/strtok3#tokenizer) source.
 *
 * This method is used internally, but can also be used for a special "tokenizer" reader.
 *
 * A tokenizer propagates the internal read functions, allowing alternative transport mechanisms, to access files, to be implemented and used.
 * @param tokenizer - File source implementing the tokenizer interface.
 * @returns The detected file type and MIME type, or `undefined` when there is no match.
 *
 * An example is [`@tokenizer/http`](https://github.com/Borewit/tokenizer-http), which requests data using [HTTP-range-requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests).
 * A difference with a conventional stream and the [*tokenizer*](https://github.com/Borewit/strtok3#tokenizer), is that it is able to *ignore* (seek, fast-forward) in the stream. For example,
 * you may only need and read the first 6 bytes, and the last 128 bytes, which may be an advantage in case reading the entire file would take longer.
 *
 * @example
 * ```
 * import {makeTokenizer} from '@tokenizer/http';
 * import {fileTypeFromTokenizer} from 'file-type';
 *
 * const audioTrackUrl = 'https://test-audio.netlify.com/Various%20Artists%20-%202009%20-%20netBloc%20Vol%2024_%20tiuqottigeloot%20%5BMP3-V2%5D/01%20-%20Diablo%20Swing%20Orchestra%20-%20Heroines.mp3';
 *
 * const httpTokenizer = await makeTokenizer(audioTrackUrl);
 * const fileType = await fileTypeFromTokenizer(httpTokenizer);
 *
 * console.log(fileType);
 * //=> {ext: 'mp3', mime: 'audio/mpeg'}
 * ```
 */

export async function fileTypeFromTokenizer(
  tokenizer: ITokenizer
): Promise<FileTypeResult | undefined> {
  try {
    return new FileTypeParser().parse(tokenizer);
  } catch (error) {
    if (!(error instanceof strtok3.EndOfStreamError)) {
      throw error;
    }
  }
}
