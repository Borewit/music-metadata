// Utilities for testing

import { Readable } from "node:stream";
import { join } from "node:path";

/**
 * A mock readable-stream, using string to read from
 */
export class SourceStream extends Readable {
  constructor(private buf: Buffer) {
    super();
  }

  public override _read() {
    this.push(this.buf);
    this.push(null); // push the EOF-signaling `null` chunk
  }
}

export const samplePath = join(__dirname, "samples");
