const latin1Decoder = new TextDecoder("latin1");

/**
 * decode uint8 array as latin1 formatted string
 * @param uint8array bytes
 * @returns decoded string
 */
export function decodeLatin1(uint8array: Uint8Array): string {
  const decodedString = latin1Decoder.decode(uint8array);
  return decodedString;
}
