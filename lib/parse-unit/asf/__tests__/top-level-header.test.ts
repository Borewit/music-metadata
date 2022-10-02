import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { GUID } from "../guid";
import { asfTopLevelHeaderObject, type AsfTopLevelHeaderObject } from "../top-level-header";

describe("unit size: ASF object header", () => {
  test("ASF object header size = 16", () => {
    const [size] = asfTopLevelHeaderObject;

    expect(size).toBe(30);
  });
});

type Case = [description: string, source: number[], expected: AsfTopLevelHeaderObject];
const cases: Case[] = [
  [
    "parse ASF object header",
    [
      0xaa, 0xbb, 0xcc, 0xdd, 0x11, 0x22, 0x44, 0x55, 0x0f, 0x1e, 0x2d, 0x3c, 0x4b, 0x5a, 0x69, 0x78, 0x44, 0x33, 0x22,
      0x11, 0x00, 0x00, 0x00, 0x00, 0xff, 0x07, 0x00, 0x00, 0x01, 0x02,
    ],
    {
      header: { id: new GUID("DDCCBBAA-2211-5544-0F1E-2D3C4B5A6978"), size: 0x11_22_33_44 },
      numberOfHeaderObjects: 0x07_ff,
    },
  ],
];

describe("unit: ASF object header", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, asfTopLevelHeaderObject);

    await expect(result).resolves.toEqual(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
