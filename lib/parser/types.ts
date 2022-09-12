import type { Result } from "../result/result";

export type Reader<T> = (buffer: Uint8Array, offset: number) => Result<T, Error>;
export type ArrayReader<T> = (buffer: Uint8Array, offset: number, length: number) => Result<T, Error>;
