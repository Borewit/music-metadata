import { describe, test, expect } from "vitest";
import {
  UINT32_LE,
  UINT32_BE,
  UINT8,
  INT8,
  INT16_BE,
  INT24_BE,
  INT32_BE,
  UINT16_LE,
  UINT16_BE,
  UINT24_LE,
  UINT24_BE,
} from "../../lib/token-types";
import { getTokenizerWithData, tokenizerCases } from "./util";

describe("encode binary numbers", () => {
  test("should encode signed 8-bit integer (INT8)", () => {
    const b = Buffer.alloc(1);

    INT8.put(b, 0, 0x00);
    expect(b.toString("binary")).toBe("\u0000");

    INT8.put(b, 0, 0x22);
    expect(b.toString("binary")).toBe("\u0022");

    INT8.put(b, 0, -0x22);
    expect(b.toString("binary")).toBe("\u00DE");
  });

  test("should encode signed 16-bit big-endian integer (INT16_BE)", () => {
    const b = Buffer.alloc(2);

    INT16_BE.put(b, 0, 0x00);
    expect(b.toString("binary")).toBe("\u0000\u0000");

    INT16_BE.put(b, 0, 0x0f_0b);
    expect(b.toString("binary")).toBe("\u000F\u000B");

    INT16_BE.put(b, 0, -0x0f_0b);
    expect(b.toString("binary")).toBe("\u00F0\u00F5");
  });

  test("should encode signed 24-bit big-endian integer (INT24_BE)", () => {
    const b = Buffer.alloc(3);

    INT24_BE.put(b, 0, 0x00);
    expect(b.toString("binary")).toBe("\u0000\u0000\u0000");

    INT24_BE.put(b, 0, 0x0f_0b_a0);
    expect(b.toString("binary")).toBe("\u000F\u000B\u00A0");

    INT24_BE.put(b, 0, -0x0f_0b_cc);
    expect(b.toString("binary")).toBe("\u00F0\u00F4\u0034");
  });

  test("should encode signed 32-bit big-endian integer (INT32_BE)", () => {
    const b = Buffer.alloc(4);

    INT32_BE.put(b, 0, 0x00);
    expect(b.toString("binary")).toBe("\u0000\u0000\u0000\u0000");

    INT32_BE.put(b, 0, 0x0f_0b_cc_a0);
    expect(b.toString("binary")).toBe("\u000F\u000B\u00CC\u00A0");

    INT32_BE.put(b, 0, -0x0f_0b_cc_a0);
    expect(b.toString("binary")).toBe("\u00F0\u00F4\u0033\u0060");
  });

  test("should encode signed 8-bit big-endian integer (INT8)", () => {
    const b = Buffer.alloc(1);

    UINT8.put(b, 0, 0x00);
    expect(b.toString("binary")).toBe("\u0000");

    UINT8.put(b, 0, 0xff);
    expect(b.toString("binary")).toBe("\u00FF");
  });

  test("should encode unsigned 16-bit big-endian integer (UINT16_LE)", () => {
    const b = Buffer.alloc(4);

    UINT16_LE.put(b, 0, 0x00);
    UINT16_LE.put(b, 2, 0xff_aa);
    expect(b.toString("binary")).toBe("\u0000\u0000\u00AA\u00FF");
  });

  test("should encode unsigned 16-bit little-endian integer (UINT16_BE)", () => {
    const b = Buffer.alloc(4);
    UINT16_BE.put(b, 0, 0xf);
    UINT16_BE.put(b, 2, 0xff_aa);
    expect(b.toString("binary")).toBe("\u0000\u000F\u00FF\u00AA");
  });

  test("should encode unsigned 16-bit mixed little/big-endian integers", () => {
    const b = Buffer.alloc(4);
    UINT16_BE.put(b, 0, 0xff_aa);
    UINT16_LE.put(b, 2, 0xff_aa);
    expect(b.toString("binary")).toBe("\u00FF\u00AA\u00AA\u00FF");
  });

  test("should encode unsigned 24-bit little-endian integer (UINT24_LE)", () => {
    const b = Buffer.alloc(3);

    UINT24_LE.put(b, 0, 0x00);
    expect(b.toString("binary")).toBe("\u0000\u0000\u0000");

    UINT24_LE.put(b, 0, 0xff);
    expect(b.toString("binary")).toBe("\u00FF\u0000\u0000");

    UINT24_LE.put(b, 0, 0xaa_bb_cc);
    expect(b.toString("binary")).toBe("\u00CC\u00BB\u00AA");
  });

  test("should encode unsigned 24-bit big-endian integer (UINT24_BE)", () => {
    const b = Buffer.alloc(3);

    UINT24_BE.put(b, 0, 0x00);
    expect(b.toString("binary")).toBe("\u0000\u0000\u0000");

    UINT24_BE.put(b, 0, 0xff);
    expect(b.toString("binary")).toBe("\u0000\u0000\u00FF");

    UINT24_BE.put(b, 0, 0xaa_bb_cc);
    expect(b.toString("binary")).toBe("\u00AA\u00BB\u00CC");
  });

  test("should encode unsigned 32-bit little-endian integer (UINT32_LE)", () => {
    const b = Buffer.alloc(4);

    UINT32_LE.put(b, 0, 0x00);
    expect(b.toString("binary")).toBe("\u0000\u0000\u0000\u0000");

    UINT32_LE.put(b, 0, 0xff);
    expect(b.toString("binary")).toBe("\u00FF\u0000\u0000\u0000");

    UINT32_LE.put(b, 0, 0xaa_bb_cc_dd);
    expect(b.toString("binary")).toBe("\u00DD\u00CC\u00BB\u00AA");
  });

  test("should encode unsigned 32-bit big-endian integer (INT32_BE)", () => {
    const b = Buffer.alloc(4);

    UINT32_BE.put(b, 0, 0x00);
    expect(b.toString("binary")).toBe("\u0000\u0000\u0000\u0000");

    UINT32_BE.put(b, 0, 0xff);
    expect(b.toString("binary")).toBe("\u0000\u0000\u0000\u00FF");

    UINT32_BE.put(b, 0, 0xaa_bb_cc_dd);
    expect(b.toString("binary")).toBe("\u00AA\u00BB\u00CC\u00DD");
  });
});

describe.each(tokenizerCases)("decode binary numbers from %s", (_name, load) => {
  test("should decode signed 8-bit integer (INT8)", async () => {
    const rst = await getTokenizerWithData("int8", load);

    let value: number = await rst.readToken(INT8);
    expect(typeof value).toBe("number");
    expect(value, "INT8 #1 == 0").toBe(0);
    value = await rst.readToken(INT8);
    expect(typeof value).toBe("number");
    expect(value, "INT8 #2 == 127").toBe(127);
    value = await rst.readToken(INT8);
    expect(typeof value).toBe("number");
    expect(value, "INT8 #3 == -128").toBe(-128);
    value = await rst.readToken(INT8);
    expect(typeof value).toBe("number");
    expect(value, "INT8 #4 == -1").toBe(-1);
    value = await rst.readToken(INT8);
    expect(typeof value).toBe("number");
    expect(value, "INT8 #5 == -127").toBe(-127);

    await rst.close();
  });

  test("should decode signed 16-bit big-endian integer (INT16_BE)", async () => {
    const rst = await getTokenizerWithData("int16", load);

    let value: number = await rst.readToken(INT16_BE);
    expect(typeof value).toBe("number");
    expect(value, "INT16_BE#1").toBe(2586);
    value = await rst.readToken(INT16_BE);
    expect(typeof value).toBe("number");
    expect(value, "INT16_BE#2").toBe(0);
    value = await rst.readToken(INT16_BE);
    expect(typeof value).toBe("number");
    expect(value, "INT16_BE#3").toBe(-1);
    value = await rst.readToken(INT16_BE);
    expect(typeof value).toBe("number");
    expect(value, "INT16_BE#4").toBe(-32_768);

    await rst.close();
  });

  test("should decode signed 24-bit big-endian integer (INT24_BE)", async () => {
    const rst = await getTokenizerWithData("int24", load);

    let value: number = await rst.readToken(INT24_BE);
    expect(typeof value).toBe("number");
    expect(value, "INT24_BE#1").toBe(0);
    value = await rst.readToken(INT24_BE);
    expect(typeof value).toBe("number");
    expect(value, "INT24_BE#2").toBe(-1);
    value = await rst.readToken(INT24_BE);
    expect(typeof value).toBe("number");
    expect(value, "INT24_BE#3").toBe(1_048_831);
    value = await rst.readToken(INT24_BE);
    expect(typeof value).toBe("number");
    expect(value, "INT24_BE#4").toBe(-8_388_608);
    await rst.close();
  });

  // ToDo: test decoding: INT24_LE

  test("should decode signed 32-bit big-endian integer (INT32_BE)", async () => {
    const rst = await getTokenizerWithData("int32", load);

    let value: number = await rst.readToken(INT32_BE);
    expect(typeof value).toBe("number");
    expect(value, "INT32_BE #1").toBe(0);
    value = await rst.readToken(INT32_BE);
    expect(typeof value).toBe("number");
    expect(value, "INT32_BE #2").toBe(-1);
    value = await rst.readToken(INT32_BE);
    expect(typeof value).toBe("number");
    expect(value, "INT32_BE #3").toBe(1_048_831);
    value = await rst.readToken(INT32_BE);
    expect(typeof value).toBe("number");
    expect(value, "INT32_BE #4").toBe(-2_147_483_648);
    await rst.close();
  });

  test("should decode unsigned 8-bit integer (UINT8)", async () => {
    const rst = await getTokenizerWithData("uint8", load);

    let value: number = await rst.readToken(UINT8);
    expect(typeof value).toBe("number");
    expect(value, "UINT8 #1").toBe(0);
    value = await rst.readToken(UINT8);
    expect(typeof value).toBe("number");
    expect(value, "UINT8 #2").toBe(26);
    value = await rst.readToken(UINT8);
    expect(typeof value).toBe("number");
    expect(value, "UINT8 #3").toBe(255);
    await rst.close();
  });

  test("should decode unsigned mixed 16-bit big/little-endian integer", async () => {
    const rst = await getTokenizerWithData("uint16", load);

    let value: number = await rst.readToken(UINT16_LE);
    expect(typeof value).toBe("number");
    expect(value, "UINT16_LE #1").toBe(0x00_1a);
    value = await rst.readToken(UINT16_BE);
    expect(typeof value).toBe("number");
    expect(value, "UINT16_BE #2").toBe(0x1a_00);
    value = await rst.readToken(UINT16_LE);
    expect(typeof value).toBe("number");
    expect(value, "UINT16_BE #3").toBe(0x00_1a);
    value = await rst.readToken(UINT16_BE);
    expect(typeof value).toBe("number");
    expect(value, "UINT16_LE #4").toBe(0x1a_00);

    await rst.close();
  });

  test("should decode signed 24-bit big/little-endian integer (UINT24_LE/INT24_BE)", async () => {
    const rst = await getTokenizerWithData("uint24", load);

    let value: number = await rst.readToken(UINT24_LE);
    expect(typeof value).toBe("number");
    expect(value, "INT24_LE#1").toBe(0x00_1a_1a);
    value = await rst.readToken(UINT24_BE);
    expect(typeof value).toBe("number");
    expect(value, "INT24_BE#2").toBe(0x1a_1a_00);
    value = await rst.readToken(UINT24_LE);
    expect(typeof value).toBe("number");
    expect(value, "INT24_LE#3").toBe(0x00_1a_1a);
    value = await rst.readToken(UINT24_BE);
    expect(typeof value).toBe("number");
    expect(value, "INT24_BE#4").toBe(0x1a_1a_00);

    await rst.close();
  });

  test("should decode unsigned 32-bit little/big-endian integer (UINT32_LE/UINT32_BE)", async () => {
    const rst = await getTokenizerWithData("uint32", load);

    let value: number = await rst.readToken(UINT32_LE);
    expect(typeof value).toBe("number");
    expect(value, "UINT24_LE #1").toBe(0x00_1a_00_1a);
    value = await rst.readToken(UINT32_BE);
    expect(typeof value).toBe("number");
    expect(value, "UINT32_BE #2").toBe(0x1a_00_1a_00);
    value = await rst.readToken(UINT32_LE);
    expect(typeof value).toBe("number");
    expect(value, "UINT32_LE #3").toBe(0x00_1a_00_1a);
    value = await rst.readToken(UINT32_BE);
    expect(typeof value).toBe("number");
    expect(value, "UINT32_BE #4").toBe(0x1a_00_1a_00);

    await rst.close();
  });

  test("should be able to read from a file", async () => {
    const tokenizer = await getTokenizerWithData("1A00", load);
    expect(tokenizer.fileInfo.size, "check file size property").toBe(16);
    let value = await tokenizer.readToken(UINT32_LE);
    expect(typeof value).toBe("number");
    expect(value, "UINT24_LE #1").toBe(0x00_1a_00_1a);
    value = await tokenizer.readToken(UINT32_BE);
    expect(typeof value).toBe("number");
    expect(value, "UINT32_BE #2").toBe(0x1a_00_1a_00);
    value = await tokenizer.readToken(UINT32_LE);
    expect(typeof value).toBe("number");
    expect(value, "UINT32_LE #3").toBe(0x00_1a_00_1a);
    value = await tokenizer.readToken(UINT32_BE);
    expect(typeof value).toBe("number");
    expect(value, "UINT32_BE #4").toBe(0x1a_00_1a_00);
  });
});
