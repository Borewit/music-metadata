/**
 *
 * @param flags
 * @param bitOffset
 * @returns
 */
export function isBitSet(flags: number, bitOffset: number): boolean {
  return getBitAllignedNumber(flags, bitOffset, 1) === 1;
}

/**
 *
 * @param flags
 * @param bitOffset
 * @param len
 * @returns
 */
export function getBitAllignedNumber(flags: number, bitOffset: number, len: number): number {
  return (flags >>> bitOffset) & (0xff_ff_ff_ff >>> (32 - len));
}
