// Utilities for testing

import { Readable } from 'stream';
import * as path from 'path';

/**
 * A mock readable-stream, using string to read from
 */
export class SourceStream extends Readable {

  constructor(private buf: Buffer) {
    super();
  }

  public _read() {
    this.push(this.buf);
    this.push(null); // push the EOF-signaling `null` chunk
  }
}

export const samplePath = path.join(__dirname, 'samples');
