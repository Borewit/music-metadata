import { describe, test, expect } from "vitest";

import { EndOfStreamError } from "../../lib/strtok3";
import { FileTokenizer } from "../../lib/strtok3/FileTokenizer";
import { UINT32_LE, UINT32_BE, UINT8 } from "../../lib/token-types";
import { Latin1StringType, Utf8StringType } from "../../lib/token-types/string";

import { getTokenizerWithData, tokenizerCases } from "./util";

describe.each(tokenizerCases)("tokenizer from %s", (_name, load) => {
  test("Handle peek token", async () => {
    const rst = await getTokenizerWithData("1A00", load);

    if (rst instanceof FileTokenizer) {
      expect(rst.fileInfo.size, "check file size property").toBe(16);
    }
    expect(rst.position).toBe(0);

    let value = await rst.peekToken<number>(UINT32_LE);
    expect(typeof value).toBe("number");
    expect(value, "UINT24_LE #1").toBe(0x00_1a_00_1a);
    expect(rst.position).toBe(0);

    value = await rst.peekToken(UINT32_LE);
    expect(typeof value).toBe("number");
    expect(value, "UINT24_LE sequential peek #2").toBe(0x00_1a_00_1a);
    expect(rst.position).toBe(0);
    value = await rst.readToken(UINT32_LE);

    expect(typeof value).toBe("number");
    expect(value, "UINT24_LE #3").toBe(0x00_1a_00_1a);
    expect(rst.position).toBe(4);
    value = await rst.readToken(UINT32_BE);
    expect(typeof value).toBe("number");
    expect(value, "UINT32_BE #4").toBe(0x1a_00_1a_00);
    expect(rst.position).toBe(8);
    value = await rst.readToken(UINT32_LE);

    expect(typeof value).toBe("number");
    expect(value, "UINT32_LE #5").toBe(0x00_1a_00_1a);
    expect(rst.position).toBe(12);
    value = await rst.readToken(UINT32_BE);

    expect(typeof value).toBe("number");
    expect(value, "UINT32_BE #6").toBe(0x1a_00_1a_00);
    expect(rst.position).toBe(16);

    await rst.close();
  });

  test("Overlapping peeks", async () => {
    const rst = await getTokenizerWithData("increment-5", load);

    const peekBuffer = Buffer.alloc(3);
    const readBuffer = Buffer.alloc(1);

    expect(rst.position).toBe(0);
    let len = await rst.peekBuffer(peekBuffer, { length: 3 }); // Peek #1
    expect(len).toBe(3);
    expect(peekBuffer.toString("ascii"), "Peek #1").toBe("\u0001\u0002\u0003");
    expect(rst.position).toBe(0);
    len = await rst.readBuffer(readBuffer, { length: 1 }); // Read #1
    expect(len).toBe(1);
    expect(rst.position).toBe(1);
    expect(readBuffer.toString("ascii"), "Read #1").toBe("\u0001");
    len = await rst.peekBuffer(peekBuffer, { length: 3 }); // Peek #2
    expect(len).toBe(3);
    expect(rst.position).toBe(1);
    expect(peekBuffer.toString("ascii"), "Peek #2").toBe("\u0002\u0003\u0004");
    len = await rst.readBuffer(readBuffer, { length: 1 }); // Read #2
    expect(len).toBe(1);
    expect(rst.position).toBe(2);
    expect(readBuffer.toString("ascii"), "Read #2").toBe("\u0002");
    len = await rst.peekBuffer(peekBuffer, { length: 3 }); // Peek #3
    expect(len).toBe(3);
    expect(rst.position).toBe(2);
    expect(peekBuffer.toString("ascii"), "Peek #3").toBe("\u0003\u0004\u0005");
    len = await rst.readBuffer(readBuffer, { length: 1 }); // Read #3
    expect(len).toBe(1);
    expect(rst.position).toBe(3);
    expect(readBuffer.toString("ascii"), "Read #3").toBe("\u0003");
    len = await rst.peekBuffer(peekBuffer, { length: 2 }); // Peek #4
    expect(len, "3 bytes requested to peek, only 2 bytes left").toBe(2);
    expect(rst.position).toBe(3);
    expect(peekBuffer.toString("ascii"), "Peek #4").toBe("\u0004\u0005\u0005");
    len = await rst.readBuffer(readBuffer, { length: 1 }); // Read #4
    expect(len).toBe(1);
    expect(rst.position).toBe(4);
    expect(readBuffer.toString("ascii"), "Read #4").toBe("\u0004");

    await rst.close();
  });

  test("should be able to read at position ahead", async () => {
    const rst = await getTokenizerWithData("peter", load);
    // should decode string from chunk
    expect(rst.position).toBe(0);
    const value = await rst.readToken(new Utf8StringType(5), 1);
    expect(typeof value).toBe("string");
    expect(value).toBe("peter");
    expect(rst.position).toBe(6);
    // should should reject at the end of the stream
    try {
      await rst.readToken(UINT8);
      expect.fail("Should reject due to end-of-stream");
    } catch (error) {
      expect(error).toBeInstanceOf(EndOfStreamError);
    }
  });

  test("should be able to peek at position ahead", async () => {
    const rst = await getTokenizerWithData("peter", load);
    // should decode string from chunk
    expect(rst.position).toBe(0);
    const value = await rst.peekToken(new Latin1StringType(5), 1);
    expect(typeof value).toBe("string");
    expect(value).toBe("peter");
    expect(rst.position).toBe(0);
  });
});
