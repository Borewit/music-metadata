/**
 * Data Type: Specifies the type of information being stored. The following values are recognized.
 */
export enum DataType {
  /**
   * Unicode string. The data consists of a sequence of Unicode characters.
   */
  UnicodeString,
  /**
   * BYTE array. The type of data is implementation-specific.
   */
  ByteArray,
  /**
   * BOOL. The data is 2 bytes long and should be interpreted as a 16-bit unsigned integer. Only 0x0000 or 0x0001 are permitted values.
   */
  Bool,
  /**
   * DWORD. The data is 4 bytes long and should be interpreted as a 32-bit unsigned integer.
   */
  DWord,
  /**
   * QWORD. The data is 8 bytes long and should be interpreted as a 64-bit unsigned integer.
   */
  QWord,
  /**
   * WORD. The data is 2 bytes long and should be interpreted as a 16-bit unsigned integer.
   */
  Word,
}
