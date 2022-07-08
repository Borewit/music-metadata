import { describe, test, expect } from "vitest";
import { getTokenizerWithData, tokenizerCases } from "./util";

const bufIncr6 = Buffer.from("\u0001\u0002\u0003\u0004\u0005\u0006", "latin1");
const buf895440 = Buffer.from("\u0089\u0054\u0040", "latin1");

describe.each(tokenizerCases)(
  "tokenizer from %s read options",
  (_name, load) => {
    test("option.offset", async () => {
      const buf = Buffer.alloc(7);
      const rst = await getTokenizerWithData("increment-6", bufIncr6, load);
      expect(await rst.readBuffer(buf, { length: 6, offset: 1 })).toBe(6);
    });

    test("option.length", async () => {
      const buf = Buffer.alloc(7);
      const rst = await getTokenizerWithData("increment-6", bufIncr6, load);
      expect(await rst.readBuffer(buf, { length: 2 })).toBe(2);
    });

    test("default length", async () => {
      const buf = Buffer.alloc(6);
      const rst = await getTokenizerWithData("increment-6", bufIncr6, load);
      expect(
        await rst.readBuffer(buf, { offset: 1 }),
        "default length = buffer.length - option.offset"
      ).toBe(5);
    });

    test("option.maybeLess = true", async () => {
      const buffer = Buffer.alloc(4);
      const rst = await getTokenizerWithData("895440", buf895440, load);
      const len = await rst.readBuffer(buffer, { mayBeLess: true });
      expect(len, "should return 3 because no more bytes are available").toBe(
        3
      );
    });

    test("option.position", async () => {
      const buffer = Buffer.alloc(5);
      const rst = await getTokenizerWithData("increment-6", bufIncr6, load);
      const len = await rst.readBuffer(buffer, { position: 1 });
      expect(len, "return value").toBe(5);
      expect(buffer.toString("binary")).toBe("\u0002\u0003\u0004\u0005\u0006");
    });

    test("should pick length from buffer, if length is not explicit defined", async () => {
      const rst = await getTokenizerWithData("increment-6", bufIncr6, load);

      const buf = Buffer.alloc(4);

      // should decode UINT8 from chunk
      expect(rst.position).toBe(0);
      const bufferLength = await rst.readBuffer(buf);
      expect(bufferLength).toBe(buf.length);
      expect(rst.position).toBe(buf.length);
    });
  }
);

describe.each(tokenizerCases)(
  "tokenizer from %s peek options",
  (_name, load) => {
    test("option.offset", async () => {
      const buf = Buffer.alloc(7);
      const rst = await getTokenizerWithData("increment-6", bufIncr6, load);
      expect(await rst.peekBuffer(buf, { length: 6, offset: 1 })).toBe(6);
    });

    test("option.length", async () => {
      const buf = Buffer.alloc(7);
      const rst = await getTokenizerWithData("increment-6", bufIncr6, load);
      expect(await rst.peekBuffer(buf, { length: 2 })).toBe(2);
    });

    test("default length", async () => {
      const buf = Buffer.alloc(6);
      const rst = await getTokenizerWithData("increment-6", bufIncr6, load);
      expect(
        await rst.peekBuffer(buf, { offset: 1 }),
        "default length = buffer.length - option.offset"
      ).toBe(5);
    });

    test("option.maybeLess = true", async () => {
      const buffer = Buffer.alloc(4);
      const rst = await getTokenizerWithData("895440", buf895440, load);
      const len = await rst.peekBuffer(buffer, { mayBeLess: true });
      expect(len, "should return 3 because no more bytes are available").toBe(
        3
      );
    });

    test("option.position", async () => {
      const buffer = Buffer.alloc(5);
      const rst = await getTokenizerWithData("increment-6", bufIncr6, load);
      const len = await rst.peekBuffer(buffer, { position: 1 });
      expect(len, "return value").toBe(5);
      expect(buffer.toString("binary")).toBe("\u0002\u0003\u0004\u0005\u0006");
    });
  }
);
