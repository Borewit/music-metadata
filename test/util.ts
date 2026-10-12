// Utilities for testing

import { createReadStream, openAsBlob } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/**
 * A mock readable-stream, using string to read from
 */
export class SourceStream extends Readable {
  private buf: Uint8Array;

  constructor(buf: Uint8Array) {
    super();
    this.buf = buf;
  }

  public _read() {
    this.push(this.buf);
    this.push(null); // push the EOF-signaling `null` chunk
  }
}

export async function makeByteReadableStreamFromFile(filename: string, _delay = 0) {
  const blob = await openAsBlob(filename);

  return {
    fileSize: blob.size,
    stream: blob.stream()
  };
}

export async function makeDefaultReadableStreamFromFile(filename: string, _delay = 0) {
  const fileInfo = await stat(filename);
  const nodeStream = createReadStream(filename);

  return {
    fileSize: fileInfo.size,
    stream: Readable.toWeb(nodeStream)
  };
}

export const samplePath = path.join(dirname, 'samples');
