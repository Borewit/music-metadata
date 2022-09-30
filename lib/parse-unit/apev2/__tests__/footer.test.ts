import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { footer, type ApeFooter } from "../footer";

describe("unit size: APEv2 footer", () => {
  test("APEv2 footer size = 32", () => {
    const [size] = footer;

    expect(size).toBe(32);
  });
});

type Case = [description: string, source: number[], expected: ApeFooter];
const cases: Case[] = [
  [
    "parse footer",
    [
      0x41, 0x50, 0x45, 0x54, 0x41, 0x47, 0x45, 0x58, 0x00, 0x01, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x03, 0x00,
      0x00, 0xc0, 0x00, 0x00, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ],
    {
      id: "APETAGEX",
      version: 0x1_00,
      size: 0x2_00,
      fields: 0x3_00,
      flags: {
        containsHeader: true,
        containsFooter: true,
        isHeader: true,
        readOnly: true,
        dataType: 3,
      },
    },
  ],
];

describe("unit: APEv2 footer", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, footer);

    await expect(result).resolves.toEqual(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
