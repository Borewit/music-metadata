const latin1Decoder = new TextDecoder("latin1");
const utf8Decoder = new TextDecoder("utf8");

/**
 * decode uint8 array as latin1 formatted string
 * @param uint8array bytes
 * @returns decoded string
 */
export function decodeLatin1(uint8array: Uint8Array): string {
  const decodedString = latin1Decoder.decode(uint8array);
  return decodedString;
}

/**
 * decode uint8 array as UTF-8 formatted string
 * @param uint8array bytes
 * @returns decoded string
 */
export function decodeUtf8(uint8array: Uint8Array): string {
  const decodedString = utf8Decoder.decode(uint8array);
  return decodedString;
}
