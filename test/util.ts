// Utilities for testing

import { join } from "node:path";
import { Readable } from "node:stream";

/**
 * A mock readable-stream, using string to read from
 */
export class SourceStream extends Readable {
  private buf: Uint8Array;

  constructor(src: Uint8Array | string) {
    super();

    this.buf = typeof src === "string" ? Buffer.from(src, "latin1") : src;
  }

  public override _read() {
    this.push(this.buf);
    this.push(null); // push the EOF-signaling `null` chunk
  }
}

export const samplePath = join(__dirname, "samples");
