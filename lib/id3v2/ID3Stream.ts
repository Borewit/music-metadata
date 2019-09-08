import { Readable } from "stream";

/**
 * Utility to convert stream to buffer
 */
export class ID3Stream extends Readable {

  constructor(private buf: Buffer) {
    super();
  }

  public _read() {
    this.push(this.buf);
    this.push(null); // push the EOF-signaling `null` chunk
  }
}
