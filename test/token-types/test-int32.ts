// Test reading int32 values.

import { describe, assert, it } from "vitest";
import * as Token from "../../lib/token-types";
import * as util from "./util";

describe("Parse 32-bit signed integer", () => {
  describe("big-endian", () => {
    it("should encode", () => {
      const buf = Buffer.alloc(4);

      Token.INT32_BE.put(buf, 0, 0x00);
      util.checkBuffer(buf, "00000000");

      Token.INT32_BE.put(buf, 0, 0x0f0bcca0);
      util.checkBuffer(buf, "0f0bcca0");

      Token.INT32_BE.put(buf, 0, -1);
      util.checkBuffer(buf, "ffffffff");

      Token.INT32_BE.put(buf, 0, -0x0f0bcca0);
      util.checkBuffer(buf, "f0f43360");
    });

    it("should decode", () => {
      let buf = Buffer.from("\x00\x00\x00\x00\xff\xff\xff\xff", "binary");
      assert.equal(Token.INT32_BE.get(buf, 0), 0);
      assert.equal(Token.INT32_BE.get(buf, 4), -1);

      buf = Buffer.from("\x00\x10\x00\xff\x80\x00\x00\x00", "binary");
      assert.equal(Token.INT32_BE.get(buf, 0), 1048831);
      assert.equal(Token.INT32_BE.get(buf, 4), -2147483648);
    });
  });

  describe("little-endian", () => {
    it("should encode", () => {
      const buf = Buffer.alloc(4);

      Token.INT32_LE.put(buf, 0, 0x00);
      util.checkBuffer(buf, "00000000");

      Token.INT32_LE.put(buf, 0, 0x0f0bcca0);
      util.checkBuffer(buf, "a0cc0b0f");

      Token.INT32_LE.put(buf, 0, -1);
      util.checkBuffer(buf, "ffffffff");

      Token.INT32_LE.put(buf, 0, -0x0f0bcca0);
      util.checkBuffer(buf, "6033f4f0");
    });

    it("should decode", () => {
      // const buf = Buffer.from('\x00\x00\x00\x00\xff\xff\xff\xff\x00\x10\x00\xff\x80\x00\x00\x00', 'binary');
      let buf = Buffer.from("\x00\x00\x00\x00\xff\xff\xff\xff", "binary");

      assert.equal(Token.INT32_LE.get(buf, 0), 0);
      assert.equal(Token.INT32_LE.get(buf, 4), -1);

      buf = Buffer.from("\xff\x00\x10\x00\x00\x00\x00\x80", "binary");
      assert.equal(Token.INT32_LE.get(buf, 0), 1048831);
      assert.equal(Token.INT32_LE.get(buf, 4), -2147483648);
    });
  });
});
