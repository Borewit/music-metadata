import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { extendedHeaderSize } from "../extended-header-size";

import type { ID3v2MajorVersion } from "../header";

test("ID3v2.2 no extended header", () => {
  const [size] = extendedHeaderSize(2);

  expect(size).toBe(0);
});

test("ID3v2.3 extended header size = 4", () => {
  const [size] = extendedHeaderSize(3);

  expect(size).toBe(4);
});

test("ID3v2.4 extended header size = 4", () => {
  const [size] = extendedHeaderSize(3);

  expect(size).toBe(4);
});

type Case = [description: string, major: ID3v2MajorVersion, source: number[], expected: number];
const cases: Case[] = [
  ["parse ID2.2 extended header size", 2, [], 0],
  ["parse ID2.3 extended header size", 3, [0x7f, 0x7f, 0x7f, 0x7f], 0x7f_7f_7f_7f],
  ["parse ID2.4 extended header size", 4, [0x7f, 0x7f, 0x7f, 0x7f], 0x0f_ff_ff_ff],
];

describe("unit: ID3v2 extended header size", () => {
  test.each(cases)("%s", async (_, version, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, extendedHeaderSize(version));

    await expect(result).resolves.toBe(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
