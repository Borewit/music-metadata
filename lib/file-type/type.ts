import type { FileExtension } from "./FileExtension";
import type { MimeType } from "./MimeType";
import type { Readable as ReadableStream } from "node:stream";

export { FileExtension } from "./FileExtension";
export { MimeType } from "./MimeType";

export interface FileTypeResult {
  /**
   * One of the supported [file types](https://github.com/sindresorhus/file-type#supported-file-types).
   */
  readonly ext: FileExtension;

  /**
   * The detected [MIME type](https://en.wikipedia.org/wiki/Internet_media_type).
   */
  readonly mime: MimeType;
}

export type ReadableStreamWithFileType = ReadableStream & {
  readonly fileType?: FileTypeResult | undefined;
};

export interface StreamOptions {
  /**
   * The default sample size in bytes.
   * @default 4100
   */
  readonly sampleSize?: number;
}
