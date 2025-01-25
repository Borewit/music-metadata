// Utilities for testing

import { Readable } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stat } from 'node:fs/promises';
import { makeByteReadableStreamFromNodeReadable } from 'node-readable-to-web-readable-stream';
import { createReadStream } from 'node:fs';

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

export async function makeReadableByteFileStream(filename: string, delay = 0) {

  const fileInfo = await stat(filename);
  const nodeStream = createReadStream(filename);

  return {
    fileSize: fileInfo.size,
    stream: makeByteReadableStreamFromNodeReadable(nodeStream)
  };
}

export const samplePath = path.join(dirname, 'samples');
