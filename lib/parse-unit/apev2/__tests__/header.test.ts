import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { header, type ApeHeader } from "../header";

describe("unit size: APEv2 header", () => {
  test("APEv2 header size = 24", () => {
    const [size] = header;

    expect(size).toBe(24);
  });
});

type Case = [description: string, source: number[], expected: ApeHeader];
const cases: Case[] = [
  [
    "parse header",
    [
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00,
    ],
    {
      compressionLevel: 0,
      formatFlags: 0,
      blocksPerFrame: 0,
      finalFrameBlocks: 0,
      totalFrames: 0,
      bitsPerSample: 0,
      channel: 0,
      sampleRate: 0,
    },
  ],
  [
    "parse header",
    [
      0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
      0xff, 0xff, 0xff, 0xff, 0xff,
    ],
    {
      compressionLevel: 0xff_ff,
      formatFlags: 0xff_ff,
      blocksPerFrame: 0xff_ff_ff_ff,
      finalFrameBlocks: 0xff_ff_ff_ff,
      totalFrames: 0xff_ff_ff_ff,
      bitsPerSample: 0xff_ff,
      channel: 0xff_ff,
      sampleRate: 0xff_ff_ff_ff,
    },
  ],
  [
    "parse header",
    [
      0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12,
      0x13, 0x14, 0x15, 0x16, 0x17,
    ],
    {
      compressionLevel: 0x01_00,
      formatFlags: 0x03_02,
      blocksPerFrame: 0x07_06_05_04,
      finalFrameBlocks: 0x0b_0a_09_08,
      totalFrames: 0x0f_0e_0d_0c,
      bitsPerSample: 0x11_10,
      channel: 0x13_12,
      sampleRate: 0x17_16_15_14,
    },
  ],
];

describe("unit: APEv2 header", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, header);

    await expect(result).resolves.toEqual(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
