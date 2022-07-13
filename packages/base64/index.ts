/**
 * Convert base64 encoded string to Uint8Array
 *
 * @param base64 base64 encoded string
 * @returns decoded bytes array
 */
export function getUint8ArrayFromBase64String(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, "base64").buffer);
}
