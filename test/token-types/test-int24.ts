// Test reading int24 values.

import { describe, assert, it } from "vitest";
import * as Token from "../../lib/token-types";
import * as util from "./util";

describe("Parse 24-bit signed integer", () => {
  describe("little-endian", () => {
    it("should encode", () => {
      const buf = Buffer.alloc(3);

      Token.INT24_LE.put(buf, 0, 0x00);
      util.checkBuffer(buf, "000000");

      Token.INT24_LE.put(buf, 0, 0x0f0ba0);
      util.checkBuffer(buf, "a00b0f");

      Token.INT24_LE.put(buf, 0, -0x0f0bcc);
      util.checkBuffer(buf, "34f4f0");
    });

    it("should decode", () => {
      const buf = Buffer.from(
        "\x00\x00\x00\xff\xff\xff\xff\x00\x10\x00\x00\x80",
        "binary"
      );

      assert.equal(Token.INT24_LE.get(buf, 0), 0);
      assert.equal(Token.INT24_LE.get(buf, 3), -1);
      assert.equal(Token.INT24_LE.get(buf, 6), 1048831);
      assert.equal(Token.INT24_LE.get(buf, 9), -8388608);
    });
  });

  describe("big-endian", () => {
    it("should encode", () => {
      const buf = Buffer.alloc(3);

      Token.INT24_BE.put(buf, 0, 0x00);
      util.checkBuffer(buf, "000000");

      Token.INT24_BE.put(buf, 0, 0x0f0ba0);
      util.checkBuffer(buf, "0f0ba0");

      Token.INT24_BE.put(buf, 0, -0x0f0bcc);
      util.checkBuffer(buf, "f0f434");
    });

    it("should decode", () => {
      const buf = Buffer.from(
        "\x00\x00\x00\xff\xff\xff\x10\x00\xff\x80\x00\x00",
        "binary"
      );

      assert.equal(Token.INT24_BE.get(buf, 0), 0);
      assert.equal(Token.INT24_BE.get(buf, 3), -1);
      assert.equal(Token.INT24_BE.get(buf, 6), 1048831);
      assert.equal(Token.INT24_BE.get(buf, 9), -8388608);
    });
  });
});
