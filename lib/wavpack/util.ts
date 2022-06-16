/**
 *
 * @param flags
 * @param bitOffset
 */
export function isBitSet(flags: number, bitOffset: number): boolean {
  return getBitAllignedNumber(flags, bitOffset, 1) === 1;
}

/**
 *
 * @param flags
 * @param bitOffset
 * @param len
 */
export function getBitAllignedNumber(
  flags: number,
  bitOffset: number,
  len: number
): number {
  return (flags >>> bitOffset) & (0xffffffff >>> (32 - len));
}
