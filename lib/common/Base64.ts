/**
 * Decode a base64 string into a Uint8Array.
 *
 * Uses native byte decoding in Node.js, with `atob` as the browser fallback.
 * Malformed input follows the native decoder's behavior; no recovery is attempted.
 */
export function decodeBase64(value: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    const decoded = Buffer.from(value, 'base64');
    // Return a Uint8Array view, not a Buffer or a second copy of the picture.
    return new Uint8Array(decoded.buffer, decoded.byteOffset, decoded.byteLength);
  }

  const binary = atob(value.replace(/\s/g, ''));
  const result = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    result[i] = binary.charCodeAt(i);
  }
  return result;
}

/**
 * Encode a Uint8Array as a base64 string.
 *
 * Builds a binary string from the bytes and encodes it with native `btoa`.
 */
export function encodeBase64(data: Uint8Array): string {
  let binary = '';
  for (const byte of data) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
