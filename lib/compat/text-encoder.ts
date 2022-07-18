const utf8Encoder = new TextEncoder();

/**
 * encode string as UTF-8 formatted string
 * @param data bytes
 * @returns encoded uint8 array
 */
export function encodeUtf8(data: string): Uint8Array {
  const encodedData = utf8Encoder.encode(data);
  return encodedData;
}
