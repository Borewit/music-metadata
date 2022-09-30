import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { pstring } from "../pstring";

test("pstring size", () => {
  const [size] = pstring(10);

  expect(size).toBe(10);
});

type Case = [description: string, source: number[], expected: string];
const cases: Case[] = [
  ["even length string", [0x03, 0x41, 0x42, 0x43], "ABC"],
  ["odd length string and padding", [0x02, 0x41, 0x42, 0x00], "AB"],
];

type InvalidCase = [description: string, source: number[], expected: RangeError];
const invalid: InvalidCase[] = [
  ["length byte longer than buffer", [0x04, 0x41, 0x42, 0x43], new RangeError("Illegal pstring length")],
  ["odd length string and no padding", [0x02, 0x41, 0x42], new RangeError("Illegal pstring length")],
];

describe("unit: pascal style string and padding byte", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, pstring(buffer.byteLength));

    await expect(result).resolves.toBe(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });

  test.each(invalid)("invalid: %s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, pstring(buffer.byteLength));

    await expect(result).rejects.toThrow(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
