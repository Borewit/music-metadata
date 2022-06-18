// Utilities for testing

import { Readable } from "node:stream";

/**
 * A mock readable-stream, using string to read from
 */
export class SourceStream extends Readable {
  private buf: Buffer;

  constructor(private str: string = "") {
    super();

    this.buf = Buffer.from(str, "latin1");
  }

  public override _read() {
    this.push(this.buf);
    this.push(null); // push the EOF-signaling `null` chunk
  }
}
