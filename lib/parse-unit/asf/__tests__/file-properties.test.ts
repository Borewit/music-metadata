import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { filePropertiesObject, type FilePropertiesObject } from "../file-properties";

import type { GUID } from "../guid";

describe("unit size: file properties object", () => {
  test("file properties object size excludes header", () => {
    const [size] = filePropertiesObject(80);

    expect(size).toBe(80);
  });
});

type Case = [description: string, source: number[], expected: FilePropertiesObject];
const cases: Case[] = [
  [
    "parse file properties object",
    [
      // file ID
      0xaa, 0xbb, 0xcc, 0xdd, 0x11, 0x22, 0x44, 0x55, 0x0f, 0x1e, 0x2d, 0x3c, 0x4b, 0x5a, 0x69, 0x78,
      // file size
      0x01, 0x00, 0x02, 0x00, 0x03, 0x00, 0x04, 0x00,
      // creation date
      0x01, 0x01, 0x02, 0x01, 0x03, 0x01, 0x04, 0x01,
      // data packets count
      0x01, 0x02, 0x02, 0x02, 0x03, 0x02, 0x04, 0x02,
      // play duration
      0x01, 0x03, 0x02, 0x03, 0x03, 0x03, 0x04, 0x03,
      // send duration
      0x01, 0x04, 0x02, 0x04, 0x03, 0x04, 0x04, 0x04,
      // pre-roll
      0x01, 0x05, 0x02, 0x05, 0x03, 0x05, 0x04, 0x05,
      // flags
      0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0011,
      // minimum data packet size
      0x11, 0x12, 0x13, 0x14,
      // maximum data packet size
      0x21, 0x22, 0x23, 0x24,
      // maximum bitrate
      0x31, 0x32, 0x33, 0x34,
    ],
    {
      fileId: "DDCCBBAA-2211-5544-0F1E-2D3C4B5A6978" as GUID,
      fileSize: 0x00_04_00_03_00_02_00_01n,
      creationDate: 0x01_04_01_03_01_02_01_01n,
      dataPacketsCount: 0x02_04_02_03_02_02_02_01n,
      playDuration: 0x03_04_03_03_03_02_03_01n,
      sendDuration: 0x04_04_04_03_04_02_04_01n,
      preroll: 0x05_04_05_03_05_02_05_01n,
      flags: {
        broadcast: true,
        seekable: true,
      },
      minimumDataPacketSize: 0x14_13_12_11,
      maximumDataPacketSize: 0x24_23_22_21,
      maximumBitrate: 0x34_33_32_31,
    },
  ],
];

describe("unit: file properties object", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, filePropertiesObject(buffer.length));

    await expect(result).resolves.toEqual(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
