const polynomial = 0x04c11db7;

const table = (() => {
  const result = new Uint32Array(256);
  for (let index = 0; index < 256; ++index) {
    let value = index << 24;
    for (let bit = 0; bit < 8; ++bit) {
      value = (value << 1) ^ (value & 0x80000000 ? polynomial : 0);
    }
    result[index] = value >>> 0;
  }
  return result;
})();

/** Compute the Ogg CRC-32; an initial value allows checksumming page fragments. */
export function crc(data: Uint8Array, initialValue = 0): number {
  let value = initialValue;
  for (const byte of data) {
    value = ((value << 8) ^ table[((value >>> 24) ^ byte) & 0xff]) >>> 0;
  }
  return value;
}
