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
        "\u0000\u0000\u0000\u00FF\u00FF\u00FF\u00FF\u0000\u0010\u0000\u0000\u0080",
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
        "\u0000\u0000\u0000\u00FF\u00FF\u00FF\u0010\u0000\u00FF\u0080\u0000\u0000",
        "binary"
      );

      assert.equal(Token.INT24_BE.get(buf, 0), 0);
      assert.equal(Token.INT24_BE.get(buf, 3), -1);
      assert.equal(Token.INT24_BE.get(buf, 6), 1048831);
      assert.equal(Token.INT24_BE.get(buf, 9), -8388608);
    });
  });
});
