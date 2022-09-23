import { describe, test, expect } from "vitest";

import { EndOfStreamError } from "../../lib/strtok3";
import { UINT32_LE, UINT32_BE, INT32_BE, IgnoreType } from "../../lib/token-types";

import { getTokenizerWithData, tokenizerCases } from "./util";

describe.each(tokenizerCases)("tokenizer from %s", (_name, load) => {
  test("number", async () => {
    const tokenizer = await getTokenizerWithData("increment-5", load);
    expect(tokenizer.fileInfo, "tokenizer.fileInfo").toBeDefined();
    await tokenizer.ignore(tokenizer.fileInfo.size! - 4);
    const x = await tokenizer.peekNumber(INT32_BE);
    expect(x).toBe(33_752_069);
  });

  test("should throw an Error if we reach EOF while peeking a number", async () => {
    const tokenizer = await getTokenizerWithData("increment-5", load);
    expect(tokenizer.fileInfo, "tokenizer.fileInfo").toBeDefined();
    await tokenizer.ignore(tokenizer.fileInfo.size! - 3);
    try {
      await tokenizer.peekNumber(INT32_BE);
      expect.fail("Should throw Error: End-Of-File");
    } catch (error) {
      expect(error).toBeInstanceOf(EndOfStreamError);
    }
    await tokenizer.close();
  });

  test("should be able to handle multiple ignores", async () => {
    const tokenizer = await getTokenizerWithData("1A00", load);
    let value = await tokenizer.readToken(UINT32_LE);
    expect(typeof value).toBe("number");
    expect(value, "UINT24_LE #1").toBe(0x00_1a_00_1a);
    await tokenizer.ignore(UINT32_BE.len);
    await tokenizer.ignore(UINT32_LE.len);
    value = await tokenizer.readToken(UINT32_BE);
    expect(typeof value).toBe("number");
    expect(value, "UINT32_BE #4").toBe(0x1a_00_1a_00);
    await tokenizer.close();
  });

  test("should be able to ignore (skip)", async () => {
    const tokenizer = await getTokenizerWithData("1A00", load);
    expect(tokenizer.position).toBe(0);
    await tokenizer.ignore(4);
    expect(tokenizer.position).toBe(4);
    let value = await tokenizer.readToken(UINT32_BE);
    expect(typeof value).toBe("number");
    expect(value, "UINT32_BE #2").toBe(0x1a_00_1a_00);
    value = await tokenizer.readToken(UINT32_LE);
    expect(typeof value).toBe("number");
    expect(value, "UINT32_LE #3").toBe(0x00_1a_00_1a);
    value = await tokenizer.readToken(UINT32_BE);
    expect(typeof value).toBe("number");
    expect(value, "UINT32_BE #4").toBe(0x1a_00_1a_00);
    await tokenizer.close();
  });

  test("should be able to parse the IgnoreType-token", async () => {
    const tokenizer = await getTokenizerWithData("1A00", load);
    await tokenizer.readToken(new IgnoreType(4));
    let value = await tokenizer.readToken(UINT32_BE);
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
