import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { fourCc } from "../four-cc";

test("FourCC size = 4", () => {
  const [size] = fourCc;

  expect(size).toBe(4);
});

type Case = [description: string, source: number[], expected: string];
const cases: Case[] = [
  ["FourCC", [0x57, 0x41, 0x56, 0x45], "WAVE"],
  ["space", [0x66, 0x6d, 0x74, 0x20], "fmt "],
  ["null", [0x66, 0x6d, 0x74, 0x00], "fmt\u0000"],
  ["four hyphens used in MP4", [0x2d, 0x2d, 0x2d, 0x2d], "----"],
  ["hyphen and nulls used in MP4", [0x2d, 0x00, 0x00, 0x00], "-\u0000\u0000\u0000"],
  ["copyright used in MP4", [0xa9, 0x6e, 0x61, 0x6d], "©nam"],
  ["parens used in AIFF", [0x28, 0x63, 0x29, 0x20], "(c) "],
];

type InvalidCase = [description: string, source: number[]];
const invalidCases: InvalidCase[] = [
  ["four nulls", [0x00, 0x00, 0x00, 0x00]],
  ["starts with space", [0x20, 0x58, 0x4d, 0x4c]],
  ["starts and ends with space", [0x20, 0x58, 0x4d, 0x20]],
  ["starts with null", [0x00, 0x58, 0x4d, 0x20]],
  ["copyright in tail", [0x20, 0xa9, 0x4d, 0x20]],
];

describe("unit: FourCC", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, fourCc);

    await expect(result).resolves.toEqual(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });

  test.each(invalidCases)("invalid: %s", async (_, bytes) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, fourCc);

    await expect(result).rejects.toThrow(Error);
  });
});
