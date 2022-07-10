// Test writing and reading uint32 values in different endiannesses.

import { describe, test, expect } from "vitest";
import { UINT64_BE, UINT64_LE } from "../../lib/token-types";
import { checkBuffer } from "./util";

describe("Parse 64-bit unsigned integer", () => {
  describe("big-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(8);

      UINT64_BE.put(buf, 0, 0x00_00_00_00_00_00_00_00n);
      checkBuffer(buf, "0000000000000000");

      UINT64_BE.put(buf, 0, 0x00_00_00_00_00_00_00_ffn);
      checkBuffer(buf, "00000000000000ff");

      UINT64_BE.put(buf, 0, 0x00_00_aa_bb_cc_dd_ee_ffn);
      checkBuffer(buf, "0000aabbccddeeff");

      UINT64_BE.put(buf, 0, 0x00_12_34_56_78_9a_bc_den);
      checkBuffer(buf, "00123456789abcde");
    });

    test("should decode", () => {
      const buf = Buffer.from([
        0x00, 0x00, 0x1a, 0x00, 0x1a, 0x00, 0x1a, 0x01, 0x00, 0x00, 0x1a, 0x00, 0x1a, 0x00, 0x1a, 0x02,
      ]);

      expect(UINT64_BE.get(buf, 0)).toBe(0x00_00_1a_00_1a_00_1a_01n);
      expect(UINT64_BE.get(buf, 8)).toBe(0x00_00_1a_00_1a_00_1a_02n);
    });
  });

  describe("litle-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(8);

      UINT64_LE.put(buf, 0, 0x00_00_00_00_00_00_00_00n);
      checkBuffer(buf, "0000000000000000");

      UINT64_LE.put(buf, 0, 0x00_00_00_00_00_00_00_ffn);
      checkBuffer(buf, "ff00000000000000");

      UINT64_LE.put(buf, 0, 0x00_00_aa_bb_cc_dd_ee_ffn);
      checkBuffer(buf, "ffeeddccbbaa0000");

      UINT64_LE.put(buf, 0, 0x00_12_34_56_78_9a_bc_den);
      checkBuffer(buf, "debc9a7856341200");
    });

    test("should decode", () => {
      const buf = Buffer.from([
        0x1a, 0x00, 0x1a, 0x00, 0x1a, 0x00, 0x1a, 0x00, 0x1a, 0x00, 0x1a, 0x00, 0x1a, 0x00, 0x1a, 0x00,
      ]);

      expect(UINT64_LE.get(buf, 0)).toBe(0x00_1a_00_1a_00_1a_00_1an);
      expect(UINT64_LE.get(buf, 8)).toBe(0x00_1a_00_1a_00_1a_00_1an);
    });
  });
});
