// Test reading int16 values.

import { describe, test, expect } from "vitest";
import { INT16_BE, INT16_LE } from "../../lib/token-types";
import { checkBuffer } from "./util";

describe("Parse 16-bit signed integer", () => {
  describe("big-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(2);

      INT16_BE.put(buf, 0, 0x00_00);
      checkBuffer(buf, "0000");

      INT16_BE.put(buf, 0, 0x0f_0b);
      checkBuffer(buf, "0f0b");

      INT16_BE.put(buf, 0, -0x0f_0b);
      checkBuffer(buf, "f0f5");
    });

    test("should decode", () => {
      const buf = Buffer.from([0x0a, 0x1a, 0x00, 0x00, 0xff, 0xff, 0x80, 0x00]);

      expect(INT16_BE.get(buf, 0)).toBe(2586);
      expect(INT16_BE.get(buf, 2)).toBe(0);
      expect(INT16_BE.get(buf, 4)).toBe(-1);
      expect(INT16_BE.get(buf, 6)).toBe(-32_768);
    });
  });

  describe("little-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(2);

      INT16_LE.put(buf, 0, 0x00_00);
      checkBuffer(buf, "0000");

      INT16_LE.put(buf, 0, 0x0f_0b);
      checkBuffer(buf, "0b0f");

      INT16_LE.put(buf, 0, -0x0f_0b);
      checkBuffer(buf, "f5f0");
    });

    test("should decode", () => {
      const buf = Buffer.from([0x1a, 0x0a, 0x00, 0x00, 0xff, 0xff, 0x00, 0x80]);

      expect(INT16_LE.get(buf, 0)).toBe(2586);
      expect(INT16_LE.get(buf, 2)).toBe(0);
      expect(INT16_LE.get(buf, 4)).toBe(-1);
      expect(INT16_LE.get(buf, 6)).toBe(-32_768);
    });
  });
});
