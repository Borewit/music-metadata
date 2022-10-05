import { EndOfStreamError } from "../../peek-readable/EndOfFileStream";

import type { BufferTokenizer } from "../../strtok3/BufferTokenizer";
import type { ITokenizer } from "../../strtok3/types";
import type { Result } from "../type/result";
import type { Unit } from "../type/unit";

const assertResult = <T, E extends Error>(result: Result<T, E>): T => {
  if (result instanceof Error) throw result as Error;
  return result;
};

/**
 * Read a token from the tokenizer-stream
 * @param unit - The token to read
 * @param buffer - If provided, the desired position in the tokenizer-stream
 * @param offset - If provided, the desired position in the tokenizer-stream
 * @returns Promise with token data
 */
export const readUnitFromBuffer = <T, E extends Error>(unit: Unit<T, E>, buffer: Uint8Array, offset: number): T => {
  return assertResult(unit[1](buffer, offset));
};

/**
 * Read a token from the tokenizer-stream
 * @param tokenizer - The token to read
 * @param unit - If provided, the desired position in the tokenizer-stream
 * @returns Promise with token data
 */
export const readUnitFromTokenizer = async <T, E extends Error>(
  tokenizer: ITokenizer,
  unit: Unit<T, E>
): Promise<T> => {
  const [size] = unit;
  const buffer = new Uint8Array(size);
  const len = await tokenizer.readBuffer(buffer);
  if (len < size) throw new EndOfStreamError();
  return readUnitFromBuffer(unit, buffer, 0);
};

/**
 * Read a token from the tokenizer-stream
 * @param tokenizer - The token to read
 * @param unit - If provided, the desired position in the tokenizer-stream
 * @returns Promise with token data
 */
export const peekUnitFromTokenizer = async <T, E extends Error>(
  tokenizer: ITokenizer,
  unit: Unit<T, E>
): Promise<T> => {
  const [size] = unit;
  const buffer = new Uint8Array(size);
  const len = await tokenizer.peekBuffer(buffer);
  if (len < size) throw new EndOfStreamError();
  return readUnitFromBuffer(unit, buffer, 0);
};

/**
 * Read a token from the buffer tokenizer-stream
 * @param tokenizer - The token to read
 * @param unit - If provided, the desired position in the tokenizer-stream
 * @returns Promise with token data
 */
export const readUnitFromBufferTokenizer = <T, E extends Error>(tokenizer: BufferTokenizer, unit: Unit<T, E>): T => {
  const [size] = unit;
  const buffer = new Uint8Array(size);
  const len = tokenizer.readBuffer(buffer);
  if (len < size) throw new EndOfStreamError();
  return readUnitFromBuffer(unit, buffer, 0);
};

/**
 * Read a token from the buffer tokenizer-stream
 * @param tokenizer - The token to read
 * @param unit - If provided, the desired position in the tokenizer-stream
 * @returns Promise with token data
 */
export const peekUnitFromBufferTokenizer = <T, E extends Error>(tokenizer: BufferTokenizer, unit: Unit<T, E>): T => {
  const [size] = unit;
  const buffer = new Uint8Array(size);
  const len = tokenizer.peekBuffer(buffer);
  if (len < size) throw new EndOfStreamError();
  return readUnitFromBuffer(unit, buffer, 0);
};
