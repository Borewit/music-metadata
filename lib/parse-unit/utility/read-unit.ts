import { EndOfStreamError } from "../../peek-readable/EndOfFileStream";

import type { ITokenizer } from "../../strtok3/types";
import type { Result } from "../type/result";
import type { Unit } from "../type/unit";

const assertResult = <Value>(result: Result<Value, Error>): Value => {
  if (result instanceof Error) throw result;
  return result;
};

/**
 * Read a token from the tokenizer-stream
 * @param tokenizer - The token to read
 * @param unit - If provided, the desired position in the tokenizer-stream
 * @param unit.0 - If provided, the desired position in the tokenizer-stream
 * @param unit.1 - If provided, the desired position in the tokenizer-stream
 * @returns Promise with token data
 */
export const readUnit = async <Value>(tokenizer: ITokenizer, [size, reader]: Unit<Value, Error>): Promise<Value> => {
  const uint8Array = new Uint8Array(size);
  const len = await tokenizer.readBuffer(uint8Array);
  if (len < size) throw new EndOfStreamError();
  return assertResult(reader(uint8Array, 0));
};

/**
 * Read a token from the tokenizer-stream
 * @param tokenizer - The token to read
 * @param unit - If provided, the desired position in the tokenizer-stream
 * @param unit.0 - If provided, the desired position in the tokenizer-stream
 * @param unit.1 - If provided, the desired position in the tokenizer-stream
 * @returns Promise with token data
 */
export const peekUnit = async <Value>(tokenizer: ITokenizer, [size, reader]: Unit<Value, Error>): Promise<Value> => {
  const uint8Array = new Uint8Array(size);
  const len = await tokenizer.peekBuffer(uint8Array);
  if (len < size) throw new EndOfStreamError();
  return assertResult(reader(uint8Array, 0));
};
