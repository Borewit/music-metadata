// Test reading int16 values.

import { describe, assert, it } from "vitest";
import * as Token from "../../lib/token-types";
import * as util from "./util";

describe("Parse 16-bit signed integer", () => {
  describe("big-endian", () => {
    it("should encode", () => {
      const buf = Buffer.alloc(2);

      Token.INT16_BE.put(buf, 0, 0x00);
      util.checkBuffer(buf, "0000");

      Token.INT16_BE.put(buf, 0, 0x0f0b);
      util.checkBuffer(buf, "0f0b");

      Token.INT16_BE.put(buf, 0, -0x0f0b);
      util.checkBuffer(buf, "f0f5");
    });

    it("should decode", () => {
      const buf = Buffer.from("\x0a\x1a\x00\x00\xff\xff\x80\x00", "binary");

      assert.equal(Token.INT16_BE.get(buf, 0), 2586);
      assert.equal(Token.INT16_BE.get(buf, 2), 0);
      assert.equal(Token.INT16_BE.get(buf, 4), -1);
      assert.equal(Token.INT16_BE.get(buf, 6), -32768);
    });
  });

  describe("little-endian", () => {
    it("should encode", () => {
      const buf = Buffer.alloc(2);

      Token.INT16_LE.put(buf, 0, 0x00);
      util.checkBuffer(buf, "0000");

      Token.INT16_LE.put(buf, 0, 0x0f0b);
      util.checkBuffer(buf, "0b0f");

      Token.INT16_LE.put(buf, 0, -0x0f0b);
      util.checkBuffer(buf, "f5f0");
    });

    it("should decode", () => {
      const buf = Buffer.from("\x1a\x0a\x00\x00\xff\xff\x00\x80", "binary");

      assert.equal(Token.INT16_LE.get(buf, 0), 2586);
      assert.equal(Token.INT16_LE.get(buf, 2), 0);
      assert.equal(Token.INT16_LE.get(buf, 4), -1);
      assert.equal(Token.INT16_LE.get(buf, 6), -32768);
    });
  });
});
