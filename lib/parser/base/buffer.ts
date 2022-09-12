/**
 * read uint8array buffer
 * @param buffer
 * @param offset
 * @param length
 * @returns uint8array
 */
export const readBuffer = (buffer: Uint8Array, offset: number, length: number): Uint8Array => {
  return buffer.subarray(offset, offset + length);
};
