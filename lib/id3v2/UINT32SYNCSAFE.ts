/**
 * 28 bits (representing up to 256MB) integer, the msb is 0 to avoid 'false syncsignals'.
 * 4 * %0xxxxxxx
 */
export const UINT32SYNCSAFE = {
  get: (buf: Uint8Array, off: number): number => {
    return (
      (buf[off + 3] & 0x7f) |
      (buf[off + 2] << 7) |
      (buf[off + 1] << 14) |
      (buf[off] << 21)
    );
  },
  len: 4,
};
