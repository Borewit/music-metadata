import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { contentDescriptionObject } from "../content-description";

import type { ITag } from "../../../type";

describe("unit size: content description object", () => {
  test("content description object", () => {
    const [size] = contentDescriptionObject(50);

    expect(size).toBe(50);
  });
});

type Case = [description: string, source: number[], expected: ITag[]];
const cases: Case[] = [
  [
    "parse content description object",
    [
      // title size
      0x0a, 0x00,
      // author size
      0x0c, 0x00,
      // copyright size
      0x02, 0x00,
      // description size
      0x08, 0x00,
      // rating size
      0x08, 0x00,
      // title
      0x54, 0x00, 0x49, 0x00, 0x54, 0x00, 0x4c, 0x00, 0x45, 0x00,
      // author
      0x41, 0x00, 0x55, 0x00, 0x54, 0x00, 0x48, 0x00, 0x4f, 0x00, 0x52, 0x00,
      // copyright
      0xa9, 0x00,
      // description
      0x44, 0x00, 0x45, 0x00, 0x53, 0x00, 0x43, 0x00,
      // rating
      0x52, 0x00, 0x41, 0x00, 0x54, 0x00, 0x45, 0x00,
    ],
    [
      { id: "Title", value: "TITLE" },
      { id: "Author", value: "AUTHOR" },
      { id: "Copyright", value: "©" },
      { id: "Description", value: "DESC" },
      { id: "Rating", value: "RATE" },
    ],
  ],
];

describe("unit: content description object", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, contentDescriptionObject(buffer.length));

    await expect(result).resolves.toEqual(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
