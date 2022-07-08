import { describe, test, expect } from "vitest";
import { EndOfStreamError } from "../../lib/peek-readable";
import { UINT8, StringType } from "../../lib/token-types";
import { getTokenizerWithData, tokenizerCases } from "./util";

const bufPeter = Buffer.from("\u0005peter", "latin1");

describe.each(tokenizerCases)(
  "tokenizer from %s read options",
  (_name, load) => {
    test("should decode buffer", async () => {
      const rst = await getTokenizerWithData("peter", bufPeter, load);
      // should decode UINT8 from chunk
      expect(rst.position).toBe(0);
      let value: string | number = await rst.readToken(UINT8);
      expect(typeof value).toBe("number");
      expect(value, "0x05 == 5").toBe(5);
      // should decode string from chunk
      expect(rst.position).toBe(1);
      value = await rst.readToken(new StringType(5, "utf8"));
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

    test("should be able to read from an absolute offset", async () => {
      const rst = await getTokenizerWithData("peter", bufPeter, load);
      // should decode UINT8 from chunk
      expect(rst.position).toBe(0);
      const value: string | number = await rst.readToken(
        new StringType(5, "utf8"),
        1
      );
      expect(typeof value).toBe("string");
      expect(value).toBe("peter");
      expect(rst.position).toBe(6);

      try {
        await rst.readToken(UINT8);
        expect.fail("Should reject due to end-of-stream");
      } catch (error) {
        expect(error).toBeInstanceOf(EndOfStreamError);
      }
    });
  }
);
