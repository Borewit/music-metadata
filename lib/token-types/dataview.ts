export function dv(array: Uint8Array) {
  return new DataView(array.buffer, array.byteOffset);
}
