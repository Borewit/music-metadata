import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { extendedStreamPropertiesObject, type ExtendedStreamPropertiesObject } from "../extended-stream-properties";

describe("unit size: extended stream properties object", () => {
  test("extended stream properties object", () => {
    const [size] = extendedStreamPropertiesObject(64);

    expect(size).toBe(64);
  });
});

type Case = [description: string, source: number[], expected: ExtendedStreamPropertiesObject];
const cases: Case[] = [
  [
    "parse extended stream properties object",
    [
      // start time
      0x01, 0x00, 0x01, 0x01, 0x01, 0x02, 0x01, 0x03,
      // end time
      0x02, 0x00, 0x02, 0x01, 0x02, 0x02, 0x02, 0x03,
      // data bitrate
      0x01, 0x02, 0x03, 0x04,
      // buffer size
      0x01, 0x02, 0x03, 0x05,
      // initial buffer fullness
      0x01, 0x02, 0x03, 0x06,
      // alternate data bitrate
      0x01, 0x02, 0x03, 0x07,
      // alternate buffer size
      0x01, 0x02, 0x03, 0x08,
      // alternate initial buffer fullness
      0x01, 0x02, 0x03, 0x09,
      // maximum object size
      0x01, 0x02, 0x03, 0x0a,
      // flag
      0xf0, 0x00, 0x00, 0x00,
      // stream number
      0xf0, 0x01,
      // stream language id
      0xf0, 0x02,
      // average time per frame
      0x03, 0x00, 0x03, 0x01, 0x03, 0x02, 0x03, 0x03,
      // stream name count
      0xf0, 0x03,
      // payload extension system count
      0xf0, 0x04,
    ],
    {
      startTime: 0x03_01_02_01_01_01_00_01n,
      endTime: 0x03_02_02_02_01_02_00_02n,
      dataBitrate: 0x04_03_02_01,
      bufferSize: 0x05_03_02_01,
      initialBufferFullness: 0x06_03_02_01,
      alternateDataBitrate: 0x07_03_02_01,
      alternateBufferSize: 0x08_03_02_01,
      alternateInitialBufferFullness: 0x09_03_02_01,
      maximumObjectSize: 0x0a_03_02_01,
      flags: {
        reliable: true,
        seekable: true,
        noCleanpoints: true,
        resendLiveCleanpoints: true,
      },
      streamNumber: 0x01_f0,
      streamLanguageId: 0x02_f0,
      averageTimePerFrame: 0x03_03_02_03_01_03_00_03n,
      streamNameCount: 0x03_f0,
      payloadExtensionSystems: 0x04_f0,
      streamNames: [],
      streamPropertiesObject: null,
    },
  ],
];

describe("unit: extended stream properties object", () => {
  test.each(cases)("%s", async (_, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, extendedStreamPropertiesObject(buffer.length));

    await expect(result).resolves.toEqual(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
