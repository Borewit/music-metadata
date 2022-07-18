/**
 * Convert Uint8Array to base64 encoded string
 * @param uint8array bytes data
 * @returns base64 encoded string
 */
export function getBase64StringFromUint8Array(uint8array: Uint8Array): string {
  return btoa([...uint8array].map((i) => String.fromCodePoint(i)).join(""));
}

/**
 * Convert base64 encoded string to Uint8Array
 * @param base64 base64 encoded string
 * @returns decoded bytes array
 */
export function getUint8ArrayFromBase64String(base64: string): Uint8Array {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.codePointAt(i);
  }
  return bytes;
}

/**
 * Convert Uint8Array to base64URL encoded string
 * @param uint8array bytes data
 * @returns base64URL encoded string
 */
export function getBase64UrlStringFromUint8Array(uint8array: Uint8Array): string {
  return getBase64StringFromUint8Array(uint8array).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * Convert base64URL encoded string to Uint8Array
 * @param base64 base64URL encoded string
 * @returns decoded bytes array
 */
export function getUint8ArrayFromBase64UrlString(base64: string): Uint8Array {
  return getUint8ArrayFromBase64String(base64.replace(/-/g, "+").replace(/_/g, "/"));
}
