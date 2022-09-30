import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { tagFlags, type ApeTagFlags } from "../tag-flags";

describe("unit size: AIFF/AIFF-C common chunk", () => {
  test("AIFF common chunk size = 18", () => {
    const [size] = tagFlags;

    expect(size).toBe(4);
  });
});

type Case = [description: string, source: number[], expected: ApeTagFlags];
const cases: Case[] = [
  [
    "all flags not set",
    [0x00, 0x00, 0x00, 0x00],
    {
      containsHeader: false,
      containsFooter: false,
      isHeader: false,
      readOnly: false,
      dataType: 0,
    },
  ],
  [
    "header flag",
    [0x00, 0x00, 0x00, 0x80],
    {
      containsHeader: true,
      containsFooter: false,
      isHeader: true,
      readOnly: false,
      dataType: 0,
    },
  ],
  [
    "footer flag",
    [0x00, 0x00, 0x00, 0x40],
    {
      containsHeader: false,
      containsFooter: true,
      isHeader: false,
      readOnly: false,
      dataType: 0,
    },
  ],
  [
    "read only flag",
    [0x01, 0x00, 0x00, 0x00],
    {
      containsHeader: false,
      containsFooter: false,
      isHeader: false,
      readOnly: true,
      dataType: 0,
    },
  ],
  [
    "data type",
    [0x06, 0x00, 0x00, 0x00],
    {
      containsHeader: false,
      containsFooter: false,
      isHeader: false,
      readOnly: false,
      dataType: 3,
    },
  ],
  [
    "all flags set",
    [0x07, 0x00, 0x00, 0xc0],
    {
      containsHeader: true,
      containsFooter: true,
      isHeader: true,
      readOnly: true,
      dataType: 3,
    },
  ],
];

describe("unit: APEv2 common chunk", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, tagFlags);

    await expect(result).resolves.toEqual(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
