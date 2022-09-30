import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { descriptor, type ApeDescriptor } from "../descriptor";

describe("unit size: APEv2 descriptor", () => {
  test("APEv2 descriptor size = 52", () => {
    const [size] = descriptor;

    expect(size).toBe(52);
  });
});

type Case = [description: string, source: number[], expected: ApeDescriptor];
const cases: Case[] = [
  [
    "parse descriptor",
    [
      0x44, 0x45, 0x53, 0x43, 0x10, 0x11, 0x12, 0x13, 0x20, 0x21, 0x22, 0x23, 0x30, 0x31, 0x32, 0x33, 0x40, 0x41, 0x42,
      0x43, 0x50, 0x51, 0x52, 0x53, 0x60, 0x61, 0x62, 0x63, 0x70, 0x71, 0x72, 0x73, 0x80, 0x81, 0x82, 0x83, 0x00, 0x01,
      0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
    ],
    {
      id: "DESC",
      version: 0x13_12_11_10,
      descriptorBytes: 0x23_22_21_20,
      headerBytes: 0x33_32_31_30,
      seekTableBytes: 0x43_42_41_40,
      headerDataBytes: 0x53_52_51_50,
      apeFrameDataBytes: 0x63_62_61_60,
      apeFrameDataBytesHigh: 0x73_72_71_70,
      terminatingDataBytes: 0x83_82_81_80,
      fileMD5: new Uint8Array([
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
      ]),
    },
  ],
];

describe("unit: APEv2 descriptor", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, descriptor);

    await expect(result).resolves.toEqual(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
