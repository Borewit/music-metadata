import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { formatChunk, type FormatChunk } from "../format-chunk";

test("Dsf format chunk size = 40", () => {
  const [size] = formatChunk;

  expect(size).toBe(40);
});

type Case = [description: string, source: number[], expected: FormatChunk];
const cases: Case[] = [
  [
    "parse Dsf format chunk",
    [
      // format version
      0x04, 0x03, 0x02, 0x01,
      // format id
      0x14, 0x13, 0x12, 0x11,
      // channel type
      0x06, 0x00, 0x00, 0x00,
      // channel num
      0x34, 0x33, 0x32, 0x31,
      // sampling frequency
      0x44, 0x43, 0x42, 0x41,
      // bits per sample
      0x54, 0x53, 0x52, 0x51,
      // sample count
      0x00, 0x00, 0x00, 0x00, 0x64, 0x63, 0x62, 0x61,
      // blocksize per channel
      0x74, 0x73, 0x72, 0x71,
      // reserved
      0x00, 0x00, 0x00, 0x00,
    ],
    {
      formatVersion: 0x01_02_03_04,
      formatID: 0x11_12_13_14,
      channelType: 6,
      channelNum: 0x31_32_33_34,
      samplingFrequency: 0x41_42_43_44,
      bitsPerSample: 0x51_52_53_54,
      sampleCount: 0x61_62_63_64_00_00_00_00n,
      blockSizePerChannel: 0x71_72_73_74,
    },
  ],
];

describe("unit: Dsf format chunk", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, formatChunk);

    await expect(result).resolves.toEqual(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
