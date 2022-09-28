import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { Id3v2TextEncoding, id3v2TextEncoding } from "../encoding";

test("ID3v1 header size = 128", () => {
  const [size] = id3v2TextEncoding;

  expect(size).toBe(1);
});

type Case = [description: string, source: number[], expected: Id3v2TextEncoding];
const cases: Case[] = [
  ["parse latin1 encoding", [0x00], "latin1"],
  ["parse UTF-16 encoding", [0x01], "utf-16"],
  ["parse UTF-16 BE encoding", [0x02], "utf-16be"],
  ["parse UTF-8 encoding", [0x03], "utf8"],
  ["parse unknown encoding", [0x04], "utf8"],
];

describe("unit: sync safe unsigned integer 32bit big endian", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, id3v2TextEncoding);

    await expect(result).resolves.toBe(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
