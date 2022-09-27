import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { header, IID3v2header } from "../header";

test("ID3v2 header size = 10", () => {
  const [size] = header;

  expect(size).toBe(10);
});

type Case = [description: string, source: number[], expected: IID3v2header];
const cases: Case[] = [
  [
    "parse ID3v2.2 header",
    [0x49, 0x44, 0x33, 0x02, 0x00, 0b0000_0000, 0x00, 0x03, 0x7f, 0x7e],
    {
      fileIdentifier: "ID3",
      major: 2,
      revision: 0,
      flags: {
        unsynchronisation: false,
        isExtendedHeader: false,
        expIndicator: false,
        footer: false,
      },
      size: 0xff_fe,
    },
  ],
  [
    "parse ID3v2.3 header",
    [0x49, 0x44, 0x33, 0x03, 0x33, 0b1010_0000, 0x06, 0x77, 0x5d, 0x7f],
    {
      fileIdentifier: "ID3",
      major: 3,
      revision: 51,
      flags: {
        unsynchronisation: true,
        isExtendedHeader: false,
        expIndicator: true,
        footer: false,
      },
      size: 0xdd_ee_ff,
    },
  ],
  [
    "parse ID3v2.4 header",
    [0x49, 0x44, 0x33, 0x04, 0xfe, 0b0101_0000, 0x66, 0x77, 0x5d, 0x7f],
    {
      fileIdentifier: "ID3",
      major: 4,
      revision: 254,
      flags: {
        unsynchronisation: false,
        isExtendedHeader: true,
        expIndicator: false,
        footer: true,
      },
      size: 0xc_dd_ee_ff,
    },
  ],
];

describe("unit: ID3v2 header", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, header);

    await expect(result).resolves.toEqual(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
