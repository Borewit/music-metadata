import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { id3v1String } from "../string";

type Case = [description: string, source: number[], expected: string];
const cases: Case[] = [
  ["parse Latin-1", [0x31, 0x32, 0x33, 0x61, 0x62, 0x63], "123abc"],
  ["trim last nulls", [0x31, 0x32, 0x33, 0x61, 0x62, 0x63, 0x00, 0x00, 0x00], "123abc"],
  ["trim last spaces", [0x31, 0x32, 0x33, 0x61, 0x62, 0x63, 0x20, 0x20, 0x20], "123abc"],
  ["trim last spaces and nulls", [0x31, 0x32, 0x33, 0x61, 0x62, 0x63, 0x20, 0x20, 0x20, 0x00, 0x00, 0x00], "123abc"],
  ["trim last nulls and spaces", [0x31, 0x32, 0x33, 0x61, 0x62, 0x63, 0x00, 0x00, 0x00, 0x20, 0x20, 0x20], "123abc"],
  ["trim strings after nulls", [0x31, 0x32, 0x33, 0x61, 0x62, 0x63, 0x00, 0x00, 0x00, 0x61, 0x62, 0x63], "123abc"],
];

describe("unit: ID3v1 string", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, id3v1String(bytes.length));

    await expect(result).resolves.toBe(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
