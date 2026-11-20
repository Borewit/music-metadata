import { TokenizerCache } from '../common/TokenizerCache.js';

/** Reuse sync lookahead for MPEG frame parsing, in addition to the generic tokenizer cache. */
export class MpegFrameReader extends TokenizerCache {
  public syncBuffer(): Uint8Array | undefined {
    // Only reuse an expected frame boundary, with enough bytes for MPEG's tail policy.
    // Junk and short tails still get a fresh lookahead to establish their physical end.
    const offset = this.cachedOffset(164);
    if (offset !== undefined && this.buffer[offset] === 0xff && (this.buffer[offset + 1] & 0xe0) === 0xe0) {
      return this.buffer.subarray(offset, this.length);
    }
    return undefined;
  }
}
