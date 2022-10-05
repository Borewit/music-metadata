import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { dsdChunk, type DsdChunk } from "../dsd-chunk";

test("Dsf DSD chunk size = 12", () => {
  const [size] = dsdChunk;

  expect(size).toBe(16);
});

type Case = [description: string, source: number[], expected: DsdChunk];
const cases: Case[] = [
  [
    "parse Dsf DSD chunk",
    [0x00, 0x00, 0x00, 0x00, 0x04, 0x03, 0x02, 0x01, 0x00, 0x00, 0x00, 0x00, 0x04, 0x03, 0x02, 0x01],
    { fileSize: 0x01_02_03_04_00_00_00_00n, metadataPointer: 0x01_02_03_04_00_00_00_00n },
  ],
  [
    "parse Dsf DSD chunk",
    [0x01, 0x02, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00],
    { fileSize: 0x00_00_00_00_04_03_02_01n, metadataPointer: 0x00_00_00_00_04_03_02_01n },
  ],
];

describe("unit: Dsf DSD chunk", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, dsdChunk);

    await expect(result).resolves.toEqual(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
