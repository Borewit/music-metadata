import { BufferTokenizer } from "../../strtok3/BufferTokenizer";

import type { Unit } from "../type/unit";

export const bytes = (length: number): Unit<Uint8Array, RangeError> => [
  length,
  (buffer, offset) => buffer.subarray(offset, offset + length),
];

export const bytesTokenizer = (length: number): Unit<BufferTokenizer, RangeError> => [
  length,
  (buffer, offset) => new BufferTokenizer(buffer.subarray(offset, offset + length)),
];
