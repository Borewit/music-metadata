import { TextEncoder } from "text-encode";

/**
 * Convert base64 encoded string to Uint8Array
 *
 * @param base64 base64 encoded string
 * @returns decoded bytes array
 */
export function getUint8ArrayFromBase64String(base64: string): Uint8Array {
  const binary_string = atob(base64);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(binary_string);
  return encoded;
}
