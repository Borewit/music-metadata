// Test reading int24 values.

import { describe, test, expect } from "vitest";
import { INT24_LE, INT24_BE } from "../../lib/token-types";
import { checkBuffer } from "./util";

describe("Parse 24-bit signed integer", () => {
  describe("little-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(3);

      INT24_LE.put(buf, 0, 0x00_00_00);
      checkBuffer(buf, "000000");

      INT24_LE.put(buf, 0, 0x0f_0b_a0);
      checkBuffer(buf, "a00b0f");

      INT24_LE.put(buf, 0, -0x0f_0b_cc);
      checkBuffer(buf, "34f4f0");
    });

    test("should decode", () => {
      const buf = Buffer.from([0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0x00, 0x10, 0x00, 0x00, 0x80]);

      expect(INT24_LE.get(buf, 0)).toBe(0);
      expect(INT24_LE.get(buf, 3)).toBe(-1);
      expect(INT24_LE.get(buf, 6)).toBe(1_048_831);
      expect(INT24_LE.get(buf, 9)).toBe(-8_388_608);
    });
  });

  describe("big-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(3);

      INT24_BE.put(buf, 0, 0x00_00_00);
      checkBuffer(buf, "000000");

      INT24_BE.put(buf, 0, 0x0f_0b_a0);
      checkBuffer(buf, "0f0ba0");

      INT24_BE.put(buf, 0, -0x0f_0b_cc);
      checkBuffer(buf, "f0f434");
    });

    test("should decode", () => {
      const buf = Buffer.from([0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x10, 0x00, 0xff, 0x80, 0x00, 0x00]);

      expect(INT24_BE.get(buf, 0)).toBe(0);
      expect(INT24_BE.get(buf, 3)).toBe(-1);
      expect(INT24_BE.get(buf, 6)).toBe(1_048_831);
      expect(INT24_BE.get(buf, 9)).toBe(-8_388_608);
    });
  });
});
