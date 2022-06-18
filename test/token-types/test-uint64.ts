// Test writing and reading uint32 values in different endiannesses.

import { describe, assert, it } from "vitest";
import * as Token from "../../lib/token-types";
import * as util from "./util";

describe("Parse 64-bit unsigned integer", () => {
  describe("big-endian", () => {
    it("should encode", () => {
      const buf = Buffer.alloc(8);

      Token.UINT64_BE.put(buf, 0, BigInt(0x00));
      util.checkBuffer(buf, "0000000000000000");

      Token.UINT64_BE.put(buf, 0, BigInt(0xff));
      util.checkBuffer(buf, "00000000000000ff");

      Token.UINT64_BE.put(buf, 0, BigInt(0xaa_bb_cc_dd_ee_ff));
      util.checkBuffer(buf, "0000aabbccddeeff");

      Token.UINT64_BE.put(buf, 0, BigInt(0x00_12_34_56_78_9a_bc_de));
      util.checkBuffer(buf, "00123456789abcde");
    });

    it("should decode", () => {
      const buf = Buffer.from(
        "\u0000\u0000\u001A\u0000\u001A\u0000\u001A\u0001\u0000\u0000\u001A\u0000\u001A\u0000\u001A\u0002",
        "binary"
      );

      assert.strictEqual(
        Token.UINT64_BE.get(buf, 0),
        BigInt(0x00_00_1a_00_1a_00_1a_01)
      );
      assert.strictEqual(
        Token.UINT64_BE.get(buf, 8),
        BigInt(0x00_00_1a_00_1a_00_1a_02)
      );
    });
  });

  describe("litle-endian", () => {
    it("should encode", () => {
      const buf = Buffer.alloc(8);

      Token.UINT64_LE.put(buf, 0, BigInt(0x00));
      util.checkBuffer(buf, "0000000000000000");

      Token.UINT64_LE.put(buf, 0, BigInt(0xff));
      util.checkBuffer(buf, "ff00000000000000");

      Token.UINT64_LE.put(buf, 0, BigInt(0xaa_bb_cc_dd_ee_ff));
      util.checkBuffer(buf, "ffeeddccbbaa0000");

      Token.UINT64_LE.put(buf, 0, BigInt(0x00_12_34_56_78_9a_bc_de));
      util.checkBuffer(buf, "debc9a7856341200");
    });

    it("should decode", () => {
      const buf = Buffer.from(
        "\u001A\u0000\u001A\u0000\u001A\u0000\u001A\u0000\u001A\u0000\u001A\u0000\u001A\u0000\u001A\u0000",
        "binary"
      );

      it("little-endian", () => {
        assert.strictEqual(Token.UINT64_LE.get(buf, 0), BigInt(0x00_1a_00_1a));
        assert.strictEqual(Token.UINT64_LE.get(buf, 8), BigInt(0x00_1a_00_1a));
      });
    });
  });
});
