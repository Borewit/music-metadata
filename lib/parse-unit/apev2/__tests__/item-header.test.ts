import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { itemHeader, type ApeItemHeader } from "../item-header";

describe("unit size: AIFF/AIFF-C common chunk", () => {
  test("AIFF common chunk size = 18", () => {
    const [size] = itemHeader;

    expect(size).toBe(8);
  });
});

type Case = [description: string, source: number[], expected: ApeItemHeader];
const cases: Case[] = [
  [
    "all flags not set",
    [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    {
      size: 0,
      flags: {
        containsHeader: false,
        containsFooter: false,
        isHeader: false,
        readOnly: false,
        dataType: 0,
      },
    },
  ],
  [
    "header flag",
    [0x01, 0x02, 0x03, 0x04, 0x03, 0x00, 0x00, 0x80],
    {
      size: 0x04_03_02_01,
      flags: {
        containsHeader: true,
        containsFooter: false,
        isHeader: true,
        readOnly: true,
        dataType: 1,
      },
    },
  ],
];

describe("unit: APEv2 common chunk", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, itemHeader);

    await expect(result).resolves.toEqual(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
