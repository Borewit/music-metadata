import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { wmPicture, type WmPicture } from "../wm-picture";

describe("unit size: WM/Picture", () => {
  test("WM/Picture size", () => {
    const [size] = wmPicture(32);

    expect(size).toBe(32);
  });
});

type Case = [description: string, source: number[], expected: WmPicture];
const cases: Case[] = [
  [
    "parse WM/Picture",
    [
      0x01, 0x80, 0x00, 0x10, 0x00, 0x6a, 0x00, 0x70, 0x00, 0x65, 0x00, 0x67, 0x00, 0x00, 0x00, 0x69, 0x00, 0x6d, 0x00,
      0x61, 0x00, 0x67, 0x00, 0x65, 0x00, 0x00, 0x00, 0xff, 0xee, 0xdd, 0xcc, 0xbb, 0xaa,
    ],
    {
      type: "32x32 pixels 'file icon' (PNG only)",
      format: "jpeg",
      description: "image",
      size: 0x00_10_00_80,
      data: new Uint8Array([0xff, 0xee, 0xdd, 0xcc, 0xbb, 0xaa]),
    },
  ],
];

describe("unit: WM/Picture", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, wmPicture(buffer.length));

    await expect(result).resolves.toEqual(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
