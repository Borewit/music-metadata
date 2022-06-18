// Test writing and reading uint24 values in different endiannesses.

import { describe, assert, it } from "vitest";
import * as Token from "../../lib/token-types";
import * as util from "./util";

describe("Parse 24-bit unsigned integer", () => {
  describe("big-endian", () => {
    it("should encode", () => {
      const buf = Buffer.alloc(3);

      Token.UINT24_BE.put(buf, 0, 0x00);
      util.checkBuffer(buf, "000000");

      Token.UINT24_BE.put(buf, 0, 0xff);
      util.checkBuffer(buf, "0000ff");

      Token.UINT24_BE.put(buf, 0, 0xaa_bb_cc);
      util.checkBuffer(buf, "aabbcc");
    });

    it("should decode", () => {
      const buf = Buffer.from(
        "\u0000\u0000\u0000\u001A\u001A\u0000\u00FF\u00FF\u00FF",
        "binary"
      );
      assert.strictEqual(Token.UINT24_BE.get(buf, 0), 0x00_00_00);
      assert.strictEqual(Token.UINT24_BE.get(buf, 3), 0x1a_1a_00);
      assert.strictEqual(Token.UINT24_BE.get(buf, 6), 0xff_ff_ff);
    });
  });

  describe("little-endian", () => {
    it("should encode", () => {
      const buf = Buffer.alloc(3);

      Token.UINT24_LE.put(buf, 0, 0x00);
      util.checkBuffer(buf, "000000");

      Token.UINT24_LE.put(buf, 0, 0xff);
      util.checkBuffer(buf, "ff0000");

      Token.UINT24_LE.put(buf, 0, 0xaa_bb_cc);
      util.checkBuffer(buf, "ccbbaa");
    });

    it("should decode", () => {
      const buf = Buffer.from(
        "\u0000\u0000\u0000\u001A\u001A\u0000\u00FF\u00FF\u00FF",
        "binary"
      );

      assert.strictEqual(Token.UINT24_LE.get(buf, 0), 0x00_00_00);
      assert.strictEqual(Token.UINT24_LE.get(buf, 3), 0x00_1a_1a);
      assert.strictEqual(Token.UINT24_LE.get(buf, 6), 0xff_ff_ff);
    });
  });
});
