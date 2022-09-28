import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { flags, frameHeader, ID3v2FrameHeader, ID3v2FrameHeaderFlags } from "../frame-header";

import type { ID3v2MajorVersion } from "../header";

describe("unit size", () => {
  test("ID3v2 frame header flags size = 2", () => {
    const [size] = flags;

    expect(size).toBe(2);
  });

  test("ID3v2.2 frame header size = 6", () => {
    const [size] = frameHeader(2);

    expect(size).toBe(6);
  });

  test("ID3v2.3 frame header size = 10", () => {
    const [size] = frameHeader(3);

    expect(size).toBe(10);
  });

  test("ID3v2.4 frame header size = 10", () => {
    const [size] = frameHeader(4);

    expect(size).toBe(10);
  });
});

describe("unit: ID3v2 frame header", () => {
  type Case = [description: string, major: ID3v2MajorVersion, source: number[], expected: ID3v2FrameHeader];
  const cases: Case[] = [
    [
      "parse ID2.2 frame header",
      2,
      [0x41, 0x42, 0x43, 0xf0, 0xf1, 0xf2],
      {
        id: "ABC",
        length: 0xf0_f1_f2,
      },
    ],
    [
      "parse ID2.3 frame header",
      3,
      [0x41, 0x42, 0x43, 0x44, 0x70, 0x71, 0x72, 0x73, 0b0000_0000, 0b0000_0000],
      {
        id: "ABCD",
        length: 0x70_71_72_73,
        flags: {
          status: {
            tagAlterPreservation: false,
            fileAlterPreservation: false,
            readOnly: false,
          },
          format: {
            groupingIdentity: false,
            compression: false,
            encryption: false,
            unsynchronisation: false,
            dataLengthIndicator: false,
          },
        },
      },
    ],
    [
      "parse ID2.4 frame header",
      4,
      [0x41, 0x42, 0x43, 0x44, 0x70, 0x71, 0x72, 0x73, 0b0111_0000, 0b1000_1111],
      {
        id: "ABCD",
        length: 0x0e_1c_79_73,
        flags: {
          status: {
            tagAlterPreservation: true,
            fileAlterPreservation: true,
            readOnly: true,
          },
          format: {
            groupingIdentity: true,
            compression: true,
            encryption: true,
            unsynchronisation: true,
            dataLengthIndicator: true,
          },
        },
      },
    ],
  ];

  test.each(cases)("%s", async (_, version, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, frameHeader(version));

    await expect(result).resolves.toEqual(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});

describe("unit: ID3v2 frame header flags", () => {
  type Case = [description: string, source: number[], expected: ID3v2FrameHeaderFlags];
  const cases: Case[] = [
    [
      "parse all flags is unset",
      [0b0000_0000, 0b0000_0000],
      {
        status: {
          tagAlterPreservation: false,
          fileAlterPreservation: false,
          readOnly: false,
        },
        format: {
          groupingIdentity: false,
          compression: false,
          encryption: false,
          unsynchronisation: false,
          dataLengthIndicator: false,
        },
      },
    ],
    [
      "parse all flags is set",
      [0b0111_0000, 0b1000_1111],
      {
        status: {
          tagAlterPreservation: true,
          fileAlterPreservation: true,
          readOnly: true,
        },
        format: {
          groupingIdentity: true,
          compression: true,
          encryption: true,
          unsynchronisation: true,
          dataLengthIndicator: true,
        },
      },
    ],
    [
      "parse flags",
      [0b0101_0000, 0b0000_1010],
      {
        status: {
          tagAlterPreservation: true,
          fileAlterPreservation: false,
          readOnly: true,
        },
        format: {
          groupingIdentity: false,
          compression: true,
          encryption: false,
          unsynchronisation: true,
          dataLengthIndicator: false,
        },
      },
    ],
    [
      "parse flags",
      [0b0010_0000, 0b1000_0101],
      {
        status: {
          tagAlterPreservation: false,
          fileAlterPreservation: true,
          readOnly: false,
        },
        format: {
          groupingIdentity: true,
          compression: false,
          encryption: true,
          unsynchronisation: false,
          dataLengthIndicator: true,
        },
      },
    ],
  ];

  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, flags);

    await expect(result).resolves.toEqual(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
