/**
 * Convert base64 encoded string to Uint8Array
 *
 * @param base64 base64 encoded string
 * @returns decoded bytes array
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function getUint8ArrayFromBase64String(base64: string): Promise<Uint8Array> {
  return Uint8Array.from(Buffer.from(base64, "base64"));
}
