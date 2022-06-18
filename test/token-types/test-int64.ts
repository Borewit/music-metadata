// Test reading int64 values.

import { describe, assert, it } from "vitest";
import * as Token from "../../lib/token-types";
import * as util from "./util";

describe("Parse 64-bit signed integer", () => {
  describe("big-endian", () => {
    it("should encode", () => {
      const buf = Buffer.alloc(8);

      Token.INT64_BE.put(buf, 0, BigInt(0x01));
      util.checkBuffer(buf, "0000000000000001");

      Token.INT64_BE.put(buf, 0, BigInt(0x00_00_ff_bb_ee_dd_cc_aa));
      util.checkBuffer(buf, "0000ffbbeeddccaa");

      Token.INT64_BE.put(buf, 0, BigInt(-1));
      util.checkBuffer(buf, "ffffffffffffffff");
    });

    it("should decode", () => {
      assert.strictEqual(
        Token.INT64_BE.get(
          Buffer.from(
            "\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
            "binary"
          ),
          0
        ),
        BigInt(0)
      );
      assert.strictEqual(
        Token.INT64_BE.get(
          Buffer.from(
            "\u00FF\u00FF\u00FF\u00FF\u00FF\u00FF\u00FF\u00FF",
            "binary"
          ),
          0
        ),
        BigInt(-1)
      );
    });
  });

  describe("little-endian", () => {
    it("should encode", () => {
      const buf = Buffer.alloc(8);

      Token.INT64_LE.put(buf, 0, BigInt(0x00));
      util.checkBuffer(buf, "0000000000000000");

      Token.INT64_LE.put(buf, 0, BigInt(0x00_00_ff_bb_ee_dd_cc_aa));
      util.checkBuffer(buf, "aaccddeebbff0000");

      Token.INT64_LE.put(buf, 0, BigInt(-1));
      util.checkBuffer(buf, "ffffffffffffffff");
    });

    it("should decode", () => {
      let buf = Buffer.from(
        "\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u00FF\u00FF\u00FF\u00FF\u00FF\u00FF\u00FF\u00FF",
        "binary"
      );

      assert.strictEqual(Token.INT64_LE.get(buf, 0), BigInt(0));
      assert.strictEqual(Token.INT64_LE.get(buf, 8), BigInt(-1));

      buf = Buffer.from(
        "\u00AA\u00CC\u00DD\u00EE\u00BB\u00FF\u0000\u0000\u00BB\u00CC\u00DD\u00EE\u00BB\u00FF\u0000\u0000",
        "binary"
      );
      assert.strictEqual(
        Token.INT64_LE.get(buf, 0),
        BigInt(0x00_00_ff_bb_ee_dd_cc_aa)
      );
      assert.strictEqual(
        Token.INT64_LE.get(buf, 8),
        BigInt(0x00_00_ff_bb_ee_dd_cc_bb)
      );
    });
  });
});
