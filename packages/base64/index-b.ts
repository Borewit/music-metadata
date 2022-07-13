/**
 * Convert base64 encoded string to Uint8Array
 * 
 * @param base64 base64 encoded string
 * @returns decoded bytes array
 */
export async function getUint8ArrayFromBase64String(base64: string): Promise<Uint8Array> {
  const binary_string = atob(base64);
  const arrayBuffer = await new Blob([binary_string], { type: "text/plain" }).arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
