// Utilities for testing

import {Readable} from "stream";

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
