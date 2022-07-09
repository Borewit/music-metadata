// Test writing and reading uint32 values in different endiannesses.

import { describe, test, expect } from "vitest";
import { UINT32_BE, UINT32_LE } from "../../lib/token-types";
import { checkBuffer } from "./util";

describe("Parse 32-bit unsigned integer", () => {
  describe("big-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(4);

      UINT32_BE.put(buf, 0, 0x00);
      checkBuffer(buf, "00000000");

      UINT32_BE.put(buf, 0, 0xff);
      checkBuffer(buf, "000000ff");

      UINT32_BE.put(buf, 0, 0xaa_bb_cc_dd);
      checkBuffer(buf, "aabbccdd");
    });

    test("should decode", () => {
      const buf = Buffer.from([0x1a, 0x00, 0x1a, 0x00, 0x1a, 0x00, 0x1a, 0x00]);

      expect(UINT32_BE.get(buf, 0)).toBe(0x1a_00_1a_00);
      expect(UINT32_BE.get(buf, 4)).toBe(0x1a_00_1a_00);
    });
  });

  describe("little-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(4);

      UINT32_LE.put(buf, 0, 0x00);
      checkBuffer(buf, "00000000");

      UINT32_LE.put(buf, 0, 0xff);
      checkBuffer(buf, "ff000000");

      UINT32_LE.put(buf, 0, 0xaa_bb_cc_dd);
      checkBuffer(buf, "ddccbbaa");
    });

    test("should decode", () => {
      const buf = Buffer.from([0x1a, 0x00, 0x1a, 0x00, 0x1a, 0x00, 0x1a, 0x00]);

      expect(UINT32_LE.get(buf, 0)).toBe(0x00_1a_00_1a);
      expect(UINT32_LE.get(buf, 4)).toBe(0x00_1a_00_1a);
    });
  });
});
