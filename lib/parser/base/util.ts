/**
 * generate dataview of uint8array
 * @param array data array
 * @returns data view
 */
export function dataview(array: Uint8Array) {
  return new DataView(array.buffer, array.byteOffset, array.byteLength);
}
