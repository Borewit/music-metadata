import type { Unit } from "../type/unit";

export const bytes = (length: number): Unit<Uint8Array, RangeError> => [
  length,
  (buffer, offset) => buffer.subarray(offset, offset + length),
];
