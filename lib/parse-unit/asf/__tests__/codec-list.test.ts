import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { codecListObject, type CodecListObject } from "../codec-list";
import { GUID } from "../guid";

describe("unit size: codec list object", () => {
  test("codec list object", () => {
    const [size] = codecListObject;

    expect(size).toBe(20);
  });
});

type Case = [description: string, source: number[], expected: CodecListObject];
const cases: Case[] = [
  [
    "parse codec list object",
    [
      // reserved
      0x41, 0x52, 0xd1, 0x86, 0x1d, 0x31, 0xd0, 0x11, 0xa3, 0xa4, 0x00, 0xa0, 0xc9, 0x03, 0x48, 0xf6,
      // codec entries count
      0x04, 0x03, 0x02, 0x01,
    ],
    {
      reserved: new GUID("86D15241-311D-11D0-A3A4-00A0C90348F6"),
      codecEntriesCount: 0x01_02_03_04,
    },
  ],
];

describe("unit: codec list object", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, codecListObject);

    await expect(result).resolves.toEqual(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
