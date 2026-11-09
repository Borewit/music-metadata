const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const BASE64_TABLE = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  BASE64_TABLE[i] = 0xff;
}
for (let i = 0; i < BASE64_CHARS.length; i++) {
  BASE64_TABLE[BASE64_CHARS.charCodeAt(i)] = i;
}

/**
 * Decode a base64 string into a Uint8Array.
 *
 * Uses native `atob` (available in Node.js ≥ 22 and browsers).
 * Invalid characters are skipped for lenient decoding.
 */
export function decodeBase64(value: string): Uint8Array {
  // Remove whitespace (common in PEM/pretty-printed base64) - avoid allocation if none
  const normalized =
    value.includes(' ') || value.includes('\n') || value.includes('\t') || value.includes('\r')
      ? value.replace(/\s/g, '')
      : value;
  // Use native atob for decoding (Node.js ≥ 22, browsers)
  // atob throws on invalid characters, so fall back to manual decoding for lenient behavior
  try {
    const binary = atob(normalized);
    const result = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      result[i] = binary.charCodeAt(i);
    }
    return result;
  } catch {
    // Fallback: manual lenient decoding (skip invalid characters)
    const length = Math.floor((normalized.length * 3) / 4);
    const result = new Uint8Array(length);
    let resultIndex = 0;
    let buffer = 0;
    let bits = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      const charValue = char < 256 ? BASE64_TABLE[char] : 0xff;
      if (charValue === 0xff) {
        continue; // skip invalid characters
      }
      buffer = (buffer << 6) | charValue;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        result[resultIndex++] = (buffer >> bits) & 0xff;
      }
    }
    return result.subarray(0, resultIndex);
  }
}

/**
 * Encode a Uint8Array as a base64 string.
 *
 * Uses native `btoa` (available in Node.js ≥ 22 and browsers).
 * Falls back to manual encoding for non-Latin1 compatible data.
 */
export function encodeBase64(data: Uint8Array): string {
  // Fast path: use native btoa when data is Latin1-compatible (all bytes < 256)
  // This is always true for Uint8Array, so we can use btoa directly.
  let binary = '';
  for (const byte of data) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
