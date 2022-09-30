import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { f80, f80Alt } from "../float80";

test("Float80 size = 10", () => {
  const [size] = f80;

  expect(size).toBe(10);
});

test("Float80 size = 10", () => {
  const [size] = f80Alt;

  expect(size).toBe(10);
});

type Case = [description: string, source: number[], expected: number];
const cases: Case[] = [
  ["parse f80 8000", [0x40, 0x0b, 0xfa, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], 8000],
  ["parse f80 44100", [0x40, 0x0e, 0xac, 0x44, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], 44_100],
  ["parse f80 48000", [0x40, 0x0e, 0xbb, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], 48_000],
  ["parse f80 88200", [0x40, 0x0f, 0xac, 0x44, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], 88_200],
  ["parse f80 96000", [0x40, 0x0f, 0xbb, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], 96_000],
  ["parse f80 192000", [0x40, 0x10, 0xbb, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], 192_000],
];

describe("unit: float point 80bit big endian", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, f80);

    await expect(result).resolves.toBe(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});

describe("unit: float point 80bit big endian", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, f80Alt);

    await expect(result).resolves.toBe(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
