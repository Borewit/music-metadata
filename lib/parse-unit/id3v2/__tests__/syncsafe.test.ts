import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { u32beSyncsafe } from "../syncsafe";

test("ID3v1 header size = 128", () => {
  const [size] = u32beSyncsafe;

  expect(size).toBe(4);
});

type Case = [description: string, source: number[], expected: number];
const cases: Case[] = [
  ["parse min integer", [0x00, 0x00, 0x00, 0x00], 0x00_00_00_00],
  ["parse max integer", [0x7f, 0x7f, 0x7f, 0x7f], 0x0f_ff_ff_ff],
  ["parse integer", [0x5a, 0x5a, 0x5a, 0x5a], 0x0b_56_ad_5a],
  ["parse invalid integer", [0x80, 0x80, 0x80, 0x80], 0x00_00_00_00],
];

describe("unit: sync safe unsigned integer 32bit big endian", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, u32beSyncsafe);

    await expect(result).resolves.toBe(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
