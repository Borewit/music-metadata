import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { iffChunkHeader, IffChunkHeader } from "../chunk-header";

test("FourCC size = 4", () => {
  const [size] = iffChunkHeader;

  expect(size).toBe(8);
});

type Case = [description: string, source: number[], expected: IffChunkHeader];
const cases: Case[] = [
  ["parse IFF chunk header", [0x46, 0x4f, 0x52, 0x4d, 0x01, 0x02, 0x03, 0x04], { id: "FORM", size: 0x01_02_03_04 }],
  ["parse IFF chunk header", [0x66, 0x20, 0x6d, 0x0, 0x01, 0x02, 0x03, 0x04], { id: "f m\0", size: 0x01_02_03_04 }],
];

describe("unit: FourCC", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, iffChunkHeader);

    await expect(result).resolves.toEqual(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
