import * as strtok3 from "../strtok3";
import { Readable as ReadableStream, PassThrough } from "node:stream";
import { fileTypeFromBuffer } from "./fileTypeFromBuffer";
import {
  StreamOptions,
  ReadableStreamWithFileType,
  FileTypeResult,
} from "./type";

const minimumBytes = 4100; // A fair amount of file-types are detectable within this range.

/**
 * Returns a `Promise` which resolves to the original readable stream argument, but with an added `fileType` property, which is an object like the one returned from `FileType.fromFile()`.
 *
 * This method can be handy to put in between a stream, but it comes with a price.
 * Internally `stream()` builds up a buffer of `sampleSize` bytes, used as a sample, to determine the file type.
 * The sample size impacts the file detection resolution.
 * A smaller sample size will result in lower probability of the best file type detection.
 *
 * **Note:** This method is only available when using Node.js.
 * **Note:** Requires Node.js 14 or later.
 * @param readableStream - A [readable stream](https://nodejs.org/api/stream.html#stream_class_stream_readable) containing a file to examine.
 * @returns A `Promise` which resolves to the original readable stream argument, but with an added `fileType` property, which is an object like the one returned from `FileType.fromFile()`.
 *
 * @example
 * ```
 * import got from 'got';
 * import {fileTypeStream} from 'file-type';
 *
 * const url = 'https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg';
 *
 * const stream1 = got.stream(url);
 * const stream2 = await fileTypeStream(stream1, {sampleSize: 1024});
 *
 * if (stream2.fileType && stream2.fileType.mime === 'image/jpeg') {
 * 	// stream2 can be used to stream the JPEG image (from the very beginning of the stream)
 * }
 * ```
 */

export async function fileTypeStream(
  readableStream: ReadableStream,
  { sampleSize = minimumBytes }: StreamOptions = {}
): Promise<ReadableStreamWithFileType> {
  // eslint-disable-next-line node/no-unsupported-features/es-syntax
  const stream = await import("node:stream");

  return new Promise((resolve, reject) => {
    readableStream.on("error", reject);

    readableStream.once("readable", () => {
      (async () => {
        try {
          // Set up output stream
          const pass: PassThrough & {
            fileType?: FileTypeResult;
          } = new stream.PassThrough();
          const outputStream: ReadableStreamWithFileType = stream.pipeline
            ? stream.pipeline(readableStream, pass, () => {
                // empty
              })
            : readableStream.pipe(pass);

          // Read the input stream and detect the filetype
          const chunk =
            readableStream.read(sampleSize) ||
            readableStream.read() ||
            Buffer.alloc(0);
          try {
            const fileType = await fileTypeFromBuffer(chunk);
            pass.fileType = fileType;
          } catch (error) {
            if (error instanceof strtok3.EndOfStreamError) {
              pass.fileType = undefined;
            } else {
              reject(error);
            }
          }

          resolve(outputStream);
        } catch (error) {
          reject(error);
        }
      })();
    });
  });
}
