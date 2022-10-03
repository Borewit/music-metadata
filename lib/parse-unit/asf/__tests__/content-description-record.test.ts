import { test, expect, describe } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { ContentDescriptionRecord, contentDescriptionRecord } from "../content-description-record";
import { GUID } from "../guid";

describe("unit size: content description record", () => {
  test("string type", () => {
    const [size] = contentDescriptionRecord("WM/String", 0, 50);

    expect(size).toBe(50);
  });

  test("byte array type", () => {
    const [size] = contentDescriptionRecord("WM/Buffer", 1, 50);

    expect(size).toBe(50);
  });

  test("boolean type", () => {
    const [size] = contentDescriptionRecord("WM/Boolean", 2, 50);

    expect(size).toBe(50);
  });

  test("32bit int type", () => {
    const [size] = contentDescriptionRecord("WM/DWord", 3, 50);

    expect(size).toBe(50);
  });

  test("64bit int type", () => {
    const [size] = contentDescriptionRecord("WM/QWord", 4, 50);

    expect(size).toBe(50);
  });

  test("16bit int type", () => {
    const [size] = contentDescriptionRecord("WM/Word", 5, 50);

    expect(size).toBe(50);
  });

  test("GUID type", () => {
    const [size] = contentDescriptionRecord("WM/GUID", 6, 50);

    expect(size).toBe(50);
  });

  test("byte array type: WM/Picture", () => {
    const [size] = contentDescriptionRecord("WM/Picture", 1, 50);

    expect(size).toBe(50);
  });
});

type Case = [description: string, name: string, type: number, source: number[], expected: ContentDescriptionRecord];
const cases: Case[] = [
  ["parse string record", "WM/String", 0, [0x54, 0x00, 0x49, 0x00, 0x54, 0x00, 0x4c, 0x00, 0x45, 0x00], "TITLE"],
  [
    "parse byte array record",
    "WM/Binary",
    1,
    [0x54, 0x49, 0x54, 0x4c, 0x45],
    new Uint8Array([0x54, 0x49, 0x54, 0x4c, 0x45]),
  ],
  ["parse boolean record", "WM/Boolean", 2, [0x01, 0x00, 0x00, 0x00], true],
  ["parse 32bit int record", "WM/DWord", 3, [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08], 0x04_03_02_01],
  [
    "parse 64bit int record",
    "WM/QWord",
    4,
    [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08],
    0x08_07_06_05_04_03_02_01n,
  ],
  ["parse 16bit int record", "WM/Word", 5, [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08], 0x02_01],
  [
    "parse GUID record",
    "WM/GUID",
    6,
    [0xaa, 0xbb, 0xcc, 0xdd, 0x11, 0x22, 0x44, 0x55, 0x0f, 0x1e, 0x2d, 0x3c, 0x4b, 0x5a, 0x69, 0x78],
    new GUID("DDCCBBAA-2211-5544-0F1E-2D3C4B5A6978"),
  ],
];

describe("unit: content description record", () => {
  test.each(cases)("%s", async (_, name, type, bytes, expected) => {
    const buffer = new Uint8Array(bytes);
    const tokenizer = new BufferTokenizer(buffer);
    const result = readUnitFromTokenizer(tokenizer, contentDescriptionRecord(name, type, buffer.length));

    await expect(result).resolves.toEqual(expected);

    // all bytes are read
    await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
  });
});
