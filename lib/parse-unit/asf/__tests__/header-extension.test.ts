import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { GUID } from "../guid";
import { headerExtensionObject, type HeaderExtensionObject } from "../header-extension";

describe("unit size: header extension object", () => {
  test("header extension object", () => {
    const [size] = headerExtensionObject;

    expect(size).toBe(22);
  });
});

type Case = [description: string, source: number[], expected: HeaderExtensionObject];
const cases: Case[] = [
  [
    "parse header extension object",
    [
      // reserved 1
      0x11, 0xd2, 0xd3, 0xab, 0xba, 0xa9, 0xcf, 0x11, 0x8e, 0xe6, 0x00, 0xc0, 0x0c, 0x20, 0x53, 0x65,
      // reserved 2
      0x06, 0x00,
      // extension data size
      0x04, 0x03, 0x02, 0x01,
    ],
    {
      reserved1: new GUID("ABD3D211-A9BA-11CF-8EE6-00C00C205365"),
      reserved2: 0x00_06,
      extensionDataSize: 0x01_02_03_04,
    },
  ],
];

describe("unit: header extension object", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, headerExtensionObject);

    await expect(result).resolves.toEqual(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
