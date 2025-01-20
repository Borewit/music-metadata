// Utilities for testing

import { Readable } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import type {ReadableByteStreamController, ReadableStreamBYOBRequest} from 'node:stream/web';

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

export async function makeByteReadableStreamFromFile(filename: string): Promise<{ fileSize: number, stream: ReadableStream<Uint8Array>, closeFile: () => Promise<void> }> {

  const fileInfo = await fs.stat(filename);
  const nodeStream = createReadStream(filename);

  return {
    fileSize: fileInfo.size,
    stream: makeByteReadableStreamFromNodeReadable(nodeStream),
    closeFile: () => Promise.resolve()
  };
}

function makeByteReadableStreamFromNodeReadable(nodeReadable: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    type: 'bytes',
    start(controller: ReadableByteStreamController) {
      const onData = (chunk: Buffer) => {
        if (controller.byobRequest) {
          const view = (controller.byobRequest as ReadableStreamBYOBRequest).view;
          const bytesToCopy = Math.min(view.byteLength, chunk.byteLength);

          new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
            .set(new Uint8Array(chunk.buffer, chunk.byteOffset, bytesToCopy));

          (controller.byobRequest as ReadableStreamBYOBRequest).respond(bytesToCopy);

          if (bytesToCopy < chunk.byteLength) {
            controller.enqueue(chunk.subarray(bytesToCopy));
          }
        } else {
          controller.enqueue(new Uint8Array(chunk));
        }
      };

      const onEnd = () => {
        controller.close();
        cleanup();
      };

      const onError = (err: Error) => {
        controller.error(err);
        cleanup();
      };

      const cleanup = () => {
        nodeReadable.off('data', onData);
        nodeReadable.off('end', onEnd);
        nodeReadable.off('error', onError);
      };

      nodeReadable.on('data', onData);
      nodeReadable.on('end', onEnd);
      nodeReadable.on('error', onError);
      nodeReadable.resume();
    },
    pull(controller) {
      if (nodeReadable.isPaused()) {
        nodeReadable.resume();
      }
    },
    cancel(reason) {
      nodeReadable.destroy(reason);
    }
  });
}


export const samplePath = path.join(dirname, 'samples');
