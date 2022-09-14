// Test reading int32 values.

import { describe, test, expect } from "vitest";

import { INT32_BE, INT32_LE } from "../../lib/token-types";

import { checkBuffer } from "./util";

describe("Parse 32-bit signed integer", () => {
  describe("big-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(4);

      INT32_BE.put(buf, 0, 0x00_00_00_00);
      checkBuffer(buf, "00000000");

      INT32_BE.put(buf, 0, 0x0f_0b_cc_a0);
      checkBuffer(buf, "0f0bcca0");

      INT32_BE.put(buf, 0, -1);
      checkBuffer(buf, "ffffffff");

      INT32_BE.put(buf, 0, -0x0f_0b_cc_a0);
      checkBuffer(buf, "f0f43360");
    });

    test("should decode", () => {
      let buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff]);

      expect(INT32_BE.get(buf, 0)).toBe(0);
      expect(INT32_BE.get(buf, 4)).toBe(-1);

      buf = Buffer.from([0x00, 0x10, 0x00, 0xff, 0x80, 0x00, 0x00, 0x00]);

      expect(INT32_BE.get(buf, 0)).toBe(1_048_831);
      expect(INT32_BE.get(buf, 4)).toBe(-2_147_483_648);
    });
  });

  describe("little-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(4);

      INT32_LE.put(buf, 0, 0x00_00_00_00);
      checkBuffer(buf, "00000000");

      INT32_LE.put(buf, 0, 0x0f_0b_cc_a0);
      checkBuffer(buf, "a0cc0b0f");

      INT32_LE.put(buf, 0, -1);
      checkBuffer(buf, "ffffffff");

      INT32_LE.put(buf, 0, -0x0f_0b_cc_a0);
      checkBuffer(buf, "6033f4f0");
    });

    test("should decode", () => {
      let buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff]);

      expect(INT32_LE.get(buf, 0)).toBe(0);
      expect(INT32_LE.get(buf, 4)).toBe(-1);

      buf = Buffer.from([0xff, 0x00, 0x10, 0x00, 0x00, 0x00, 0x00, 0x80]);

      expect(INT32_LE.get(buf, 0)).toBe(1_048_831);
      expect(INT32_LE.get(buf, 4)).toBe(-2_147_483_648);
    });
  });
});
