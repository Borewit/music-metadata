import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { GUID } from "../guid";
import { streamPropertiesObject, type StreamPropertiesObject } from "../stream-properties-object";

describe("unit size: stream properties object", () => {
  test("stream properties object size excludes header", () => {
    const [size] = streamPropertiesObject(80);

    expect(size).toBe(80);
  });
});

type Case = [description: string, source: number[], expected: StreamPropertiesObject];
const cases: Case[] = [
  [
    "parse stream properties object",
    [
      // stream type
      0x40, 0x9e, 0x69, 0xf8, 0x4d, 0x5b, 0xcf, 0x11, 0xa8, 0xfd, 0x00, 0x80, 0x5f, 0x5c, 0x44, 0x2b,
      // error collection type
      0xaa, 0xbb, 0xcc, 0xdd, 0x11, 0x22, 0x44, 0x55, 0x0f, 0x1e, 0x2d, 0x3c, 0x4b, 0x5a, 0x69, 0x78,

      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00,
    ],
    {
      streamType: "audio",
      errorCorrectionType: new GUID("DDCCBBAA-2211-5544-0F1E-2D3C4B5A6978"),
    },
  ],
];

describe("unit: stream properties object", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, streamPropertiesObject(buffer.length));

    await expect(result).resolves.toEqual(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
