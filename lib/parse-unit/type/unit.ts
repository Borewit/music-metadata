import type { Result } from "./result";

export type Unit<T extends NonNullable<unknown>, E extends Error> = [
  size: number,
  reader: (buffer: Uint8Array, offset: number) => Result<T, E>
];
