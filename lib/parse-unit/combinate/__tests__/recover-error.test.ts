import { test, expect } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { recover } from "../recover-error";

import type { Unit } from "../../type/unit";

const buffer = new Uint8Array([0x00, 0x01]);

class NumError extends Error {
  constructor(public readonly num: number) {
    super(`number: ${num}`);
  }
}

const errorUnit: Unit<number, NumError> = [1, () => new NumError(18)];

test("unit: map unit result", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, errorUnit)).rejects.toThrowError(new NumError(18));

  await expect(
    readUnitFromTokenizer(
      tokenizer,
      recover(errorUnit, (e) => e.num)
    )
  ).resolves.toEqual(18);
});
