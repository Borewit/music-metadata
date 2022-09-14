// Test writing and reading uint16 values in different endiannesses.

import { describe, test, expect } from "vitest";

import { UINT16_LE, UINT16_BE } from "../../lib/token-types";

import { checkBuffer } from "./util";

describe("Parse 16-bit unsigned integer", () => {
  describe("combined little- and big-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(4);

      UINT16_LE.put(buf, 0, 0x00);
      UINT16_LE.put(buf, 2, 0xff_aa);
      checkBuffer(buf, "0000aaff");

      UINT16_BE.put(buf, 0, 0x00);
      UINT16_BE.put(buf, 2, 0xff_aa);
      checkBuffer(buf, "0000ffaa");

      UINT16_BE.put(buf, 0, 0xff_aa);
      UINT16_LE.put(buf, 2, 0xff_aa);
      checkBuffer(buf, "ffaaaaff");
    });

    test("should decode", () => {
      const buf = Buffer.from([0x1a, 0x00, 0x1a, 0x00, 0x1a, 0x00, 0x1a, 0x00]);

      expect(UINT16_LE.get(buf, 0)).toBe(0x00_1a);
      expect(UINT16_BE.get(buf, 2)).toBe(0x1a_00);
      expect(UINT16_LE.get(buf, 4)).toBe(0x00_1a);
      expect(UINT16_BE.get(buf, 6)).toBe(0x1a_00);
    });
  });
});
