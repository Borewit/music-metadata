export const dataview = (buffer: Uint8Array) => {
  return new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
};
