// Test writing and reading uint24 values in different endiannesses.

import { describe, test, expect } from "vitest";
import { UINT24_BE, UINT24_LE } from "../../lib/token-types";
import { checkBuffer } from "./util";

describe("Parse 24-bit unsigned integer", () => {
  describe("big-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(3);

      UINT24_BE.put(buf, 0, 0x00_00_00);
      checkBuffer(buf, "000000");

      UINT24_BE.put(buf, 0, 0x00_00_ff);
      checkBuffer(buf, "0000ff");

      UINT24_BE.put(buf, 0, 0xaa_bb_cc);
      checkBuffer(buf, "aabbcc");
    });

    test("should decode", () => {
      const buf = Buffer.from([0x00, 0x00, 0x00, 0x1a, 0x1a, 0x00, 0xff, 0xff, 0xff]);
      expect(UINT24_BE.get(buf, 0)).toBe(0x00_00_00);
      expect(UINT24_BE.get(buf, 3)).toBe(0x1a_1a_00);
      expect(UINT24_BE.get(buf, 6)).toBe(0xff_ff_ff);
    });
  });

  describe("little-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(3);

      UINT24_LE.put(buf, 0, 0x00_00_00);
      checkBuffer(buf, "000000");

      UINT24_LE.put(buf, 0, 0x00_00_ff);
      checkBuffer(buf, "ff0000");

      UINT24_LE.put(buf, 0, 0xaa_bb_cc);
      checkBuffer(buf, "ccbbaa");
    });

    test("should decode", () => {
      const buf = Buffer.from([0x00, 0x00, 0x00, 0x1a, 0x1a, 0x00, 0xff, 0xff, 0xff]);

      expect(UINT24_LE.get(buf, 0)).toBe(0x00_00_00);
      expect(UINT24_LE.get(buf, 3)).toBe(0x00_1a_1a);
      expect(UINT24_LE.get(buf, 6)).toBe(0xff_ff_ff);
    });
  });
});
