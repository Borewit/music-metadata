/**
 * Read-only token
 * See https://github.com/Borewit/strtok3 for more information
 */
export interface IGetToken<V, VS extends Uint8Array = Uint8Array> {
  /**
   * Length of encoded token in bytes
   */
  len: number;

  /**
   * Decode value from buffer at offset
   * @param array - Uint8Array to read the decoded value from
   * @param offset - Decode offset
   * @return decoded value
   */
  get(array: VS, offset: number): V;
}

export interface IToken<V, VS extends Uint8Array = Uint8Array>
  extends IGetToken<V, VS> {
  /**
   * Encode value to buffer
   * @param array - Uint8Array to write the encoded value to
   * @param offset - Buffer write offset
   * @param value - Value to decode of type T
   * @return offset plus number of bytes written
   */
  put(array: VS, offset: number, value: V): number;
}
