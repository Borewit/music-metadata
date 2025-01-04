// Utilities for testing

import { Readable } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { ReadableStream } from 'node:stream/web';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/**
 * A mock readable-stream, using string to read from
 */
export class SourceStream extends Readable {

  constructor(private buf: Uint8Array) {
    super();
  }

  public _read() {
    this.push(this.buf);
    this.push(null); // push the EOF-signaling `null` chunk
  }
}

export async function makeReadableByteFileStream(filename: string, delay = 0): Promise<{ fileSize: number, stream: ReadableStream<Uint8Array>, closeFile: () => Promise<void> }> {

  let position = 0;
  const fileInfo = await fs.stat(filename);
  const fileHandle = await fs.open(filename, 'r');

  return {
    fileSize: fileInfo.size,
    stream: new ReadableStream({
      type: 'bytes',

      async pull(controller) {

        // @ts-ignore
        const view = controller.byobRequest.view;

        setTimeout(async () => {
          try {
            const {bytesRead} = await fileHandle.read(view, 0, view.byteLength, position);
            if (bytesRead === 0) {
              await fileHandle.close();
              controller.close();
              // @ts-ignore
              controller.byobRequest.respond(0);
            } else {
              position += bytesRead;
              // @ts-ignore
              controller.byobRequest.respond(bytesRead);
            }
          } catch (err) {
            controller.error(err);
            await fileHandle.close();
          }
        }, delay);
      },

      cancel() {
        return fileHandle.close();
      },

      autoAllocateChunkSize: 1024
    }),
    closeFile: () => {
      return fileHandle.close();
    }
  };
}

export const samplePath = path.join(dirname, 'samples');
