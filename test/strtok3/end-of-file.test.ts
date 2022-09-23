import { describe, test, expect } from "vitest";

import { EndOfStreamError } from "../../lib/peek-readable/EndOfFileStream";
import { INT32_BE, UINT24_BE } from "../../lib/token-types";

import { getTokenizerWithData, tokenizerCases } from "./util";

describe.each(tokenizerCases)("tokenizer from %s", (_name, load) => {
  test("should not throw an Error if we read exactly until the end of the file", async () => {
    const rst = await getTokenizerWithData("895440", load);

    const num = await rst.readToken(UINT24_BE);
    expect(num).toBe(9_000_000);
    await rst.close();
  });

  test("readBuffer()", async () => {
    const tokenizer = await getTokenizerWithData("1A00", load);
    const buf = Buffer.alloc(16);
    const bytesRead = await tokenizer.readBuffer(buf);
    expect(typeof bytesRead, "readBuffer promise should provide a number").toBe("number");
    expect(bytesRead).toBe(16);
    try {
      await tokenizer.readBuffer(buf);
      expect.fail("Should throw EOF");
    } catch (error) {
      expect(error).toBeInstanceOf(EndOfStreamError);
    }
  });

  test("should not throw an Error if we read exactly until the end of the file", async () => {
    const rst = await getTokenizerWithData("895440", load);
    const num = await rst.readToken(UINT24_BE);
    expect(num).toBe(9_000_000);
  });

  test("should be thrown if a token EOF reached in the middle of a token", async () => {
    const rst = await getTokenizerWithData("895440", load);
    try {
      await rst.readToken(INT32_BE);
      expect.fail("It should throw EndOfFile Error");
    } catch (error) {
      expect(error).toBeInstanceOf(EndOfStreamError);
    }
  });

  test("should throw an EOF if we read to buffer", async () => {
    const buffer = Buffer.alloc(4);

    const rst = await getTokenizerWithData("895440", load);
    try {
      await rst.readBuffer(buffer);
      expect.fail("It should throw EndOfFile Error");
    } catch (error) {
      expect(error).toBeInstanceOf(EndOfStreamError);
    }
  });

  test("should throw an EOF if we peek to buffer", async () => {
    const buffer = Buffer.alloc(4);
    const rst = await getTokenizerWithData("895440", load);
    try {
      await rst.peekBuffer(buffer);
      expect.fail("It should throw EndOfFile Error");
    } catch (error) {
      expect(error).toBeInstanceOf(EndOfStreamError);
    }
  });
});
