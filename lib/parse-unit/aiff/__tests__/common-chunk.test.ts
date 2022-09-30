import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { commonChunk, type AiffCommonChunk } from "../common-chunk";

describe("unit size: AIFF/AIFF-C common chunk", () => {
  test("AIFF common chunk size = 18", () => {
    const [size] = commonChunk(18, false);

    expect(size).toBe(18);
  });

  test("AIFF common chunk size = 20", () => {
    const [size] = commonChunk(20, false);

    expect(size).toBe(20);
  });

  test("AIFC common chunk size = 22", () => {
    const [size] = commonChunk(22, true);

    expect(size).toBe(22);
  });

  test("AIFC common chunk size = 28", () => {
    const [size] = commonChunk(28, true);

    expect(size).toBe(28);
  });

  test("invalid: AIFF common chunk at least 18", () => {
    expect(() => commonChunk(17, false)).toThrow(new Error("COMMON CHUNK size should always be at least 18"));
  });

  test("invalid: AIFF-C common chunk at least 22", () => {
    expect(() => commonChunk(21, true)).toThrow(new Error("COMMON CHUNK size should always be at least 22"));
  });
});

type Case = [description: string, source: number[], isCompressed: boolean, expected: AiffCommonChunk];
const cases: Case[] = [
  [
    "AIFF",
    [0x12, 0x34, 0x01, 0x02, 0x03, 0x04, 0x56, 0x78, 0x40, 0x0e, 0xbb, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    false,
    {
      numChannels: 0x12_34,
      numSampleFrames: 0x01_02_03_04,
      sampleSize: 0x56_78,
      sampleRate: 48_000,
      // compressionType: "",
      compressionName: "PCM",
    },
  ],
  [
    "AIFC",
    [
      0x12, 0x34, 0x01, 0x02, 0x03, 0x04, 0x56, 0x78, 0x40, 0x0e, 0xbb, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x41,
      0x43, 0x45, 0x32, 0x0a, 0x41, 0x43, 0x45, 0x20, 0x32, 0x2d, 0x74, 0x6f, 0x2d, 0x31, 0x00,
    ],
    true,
    {
      numChannels: 0x12_34,
      numSampleFrames: 0x01_02_03_04,
      sampleSize: 0x56_78,
      sampleRate: 48_000,
      compressionType: "ACE2",
      compressionName: "ACE 2-to-1",
    },
  ],
];

describe("unit: AIFF/AIFF-C common chunk", () => {
  test.each(cases)("%s", async (_, bytes, isComplessed, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, commonChunk(buffer.byteLength, isComplessed));

    await expect(result).resolves.toEqual(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
