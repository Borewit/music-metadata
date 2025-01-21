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

export function makeByteReadableStreamFromNodeReadable(nodeReadable: Readable): ReadableStream<Uint8Array> {
  let leftoverChunk: Uint8Array | null = null;

  return new ReadableStream<Uint8Array>({
    type: 'bytes',
    start(controller: ReadableByteStreamController) {
      // Process any leftover data from previous read
      const processLeftover = () => {
        while (leftoverChunk) {
          const byobRequest = controller.byobRequest;
          if (byobRequest) {
            const view = (controller.byobRequest as ReadableStreamBYOBRequest).view;
            const bytesToCopy = Math.min(view.byteLength, leftoverChunk.length);

            console.log(`[DEBUG] leftoverChunk length: ${leftoverChunk?.length}`);
            console.log(`[DEBUG] BYOB request size: ${view.byteLength}`);

            // Copy leftoverChunk into the BYOB buffer
            new Uint8Array(view.buffer, view.byteOffset, bytesToCopy).set(
              leftoverChunk.subarray(0, bytesToCopy)
            );

            (controller.byobRequest as ReadableStreamBYOBRequest).respond(bytesToCopy);

            // Update leftoverChunk with unprocessed data
            if (bytesToCopy < leftoverChunk.length) {
              leftoverChunk = leftoverChunk.subarray(bytesToCopy);
            } else {
              leftoverChunk = null;
            }
          } else {
            // No BYOB request, enqueue leftover data
            controller.enqueue(leftoverChunk);
            leftoverChunk = null;
          }
        }

        // If no leftoverChunk, resume Node.js stream
        if (controller.desiredSize !== null && controller.desiredSize > 0 && nodeReadable.isPaused()) {
          nodeReadable.resume();
        }
      };

      const onData = (chunk: Buffer) => {
        if (leftoverChunk) {
          // Combine leftover data with new chunk
          const combined = new Uint8Array(leftoverChunk.length + chunk.length);
          combined.set(leftoverChunk);
          combined.set(chunk, leftoverChunk.length);
          leftoverChunk = combined;
        } else {
          leftoverChunk = new Uint8Array(chunk);
        }

        processLeftover();  // Process leftover data immediately
      };

      const onEnd = () => {
        if (leftoverChunk) {
          controller.enqueue(leftoverChunk);
          leftoverChunk = null;
        }
        controller.close();
      };

      const onError = (err: Error) => {
        controller.error(err);
      };

      nodeReadable.on('data', onData);
      nodeReadable.on('end', onEnd);
      nodeReadable.on('error', onError);

      nodeReadable.resume();
    },
    pull(controller: ReadableByteStreamController) {
      // If there's leftover data, process it
      if (leftoverChunk) {
        const byobRequest = controller.byobRequest;
        if (byobRequest) {
          const view = (controller.byobRequest as ReadableStreamBYOBRequest).view;

          const bytesToCopy = Math.min(view.byteLength, leftoverChunk.length);

          new Uint8Array(view.buffer, view.byteOffset, bytesToCopy).set(
            leftoverChunk.subarray(0, bytesToCopy)
          );

          (controller.byobRequest as ReadableStreamBYOBRequest).respond(bytesToCopy);

          if (bytesToCopy < leftoverChunk.length) {
            leftoverChunk = leftoverChunk.subarray(bytesToCopy);
          } else {
            leftoverChunk = null;
          }
        } else {
          controller.enqueue(leftoverChunk);
          leftoverChunk = null;
        }
      }

      // Always resume the Node.js stream if paused
      if (!leftoverChunk && nodeReadable.isPaused()) {
        nodeReadable.resume();
      }
    },
    cancel(reason) {
      nodeReadable.destroy(reason);
    },
  });
}


export const samplePath = path.join(dirname, 'samples');
