// Test writing and reading uint8 values.

import { describe, test, expect } from "vitest";
import {
  Float16_BE,
  Float16_LE,
  Float32_BE,
  Float32_LE,
  Float64_BE,
  Float64_LE,
  Float80_BE,
  Float80_LE,
} from "../../lib/token-types";
import { checkBuffer } from "./util";

describe("16-bit (half precision)", () => {
  describe("big-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(2);

      Float16_BE.put(buf, 0, 0);
      checkBuffer(buf, "0000");

      Float16_BE.put(buf, 0, 85.125);
      checkBuffer(buf, "5552");

      Float16_BE.put(buf, 0, -1);
      checkBuffer(buf, "bc00");
    });

    test("should decode", () => {
      const buf = Buffer.from([0x55, 0x52]);
      expect(Float16_BE.get(buf, 0)).toBe(85.125);
    });
  });

  describe("little-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(2);

      Float16_LE.put(buf, 0, 0);
      checkBuffer(buf, "0000");

      Float16_LE.put(buf, 0, 85.125);
      checkBuffer(buf, "5255");

      Float16_LE.put(buf, 0, -1);
      checkBuffer(buf, "00bc");
    });

    test("should decode", () => {
      const buf = Buffer.from([0x52, 0x55]);
      expect(Float16_LE.get(buf, 0)).toBe(85.125);
    });
  });
});

describe("32-bit (single precision)", () => {
  describe("big-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(4);

      Float32_BE.put(buf, 0, 0);
      checkBuffer(buf, "00000000");

      Float32_BE.put(buf, 0, 85.125);
      checkBuffer(buf, "42aa4000");

      Float32_BE.put(buf, 0, -1);
      checkBuffer(buf, "bf800000");
    });

    test("should decode", () => {
      const buf = Buffer.from([0x42, 0xaa, 0x40, 0x00]);
      expect(Float32_BE.get(buf, 0)).toBe(85.125);
    });
  });

  describe("little-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(4);

      Float32_LE.put(buf, 0, 0);
      checkBuffer(buf, "00000000");

      Float32_LE.put(buf, 0, 85.125);
      checkBuffer(buf, "0040aa42");

      Float32_LE.put(buf, 0, -1);
      checkBuffer(buf, "000080bf");
    });

    test("should decode", () => {
      const buf = Buffer.from([0x00, 0x40, 0xaa, 0x42]);
      expect(Float32_LE.get(buf, 0)).toBe(85.125);
    });
  });
});

describe("64-bit (double precision)", () => {
  describe("big-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(8);

      Float64_BE.put(buf, 0, 0);
      checkBuffer(buf, "0000000000000000");

      Float64_BE.put(buf, 0, 85.125);
      checkBuffer(buf, "4055480000000000");

      Float64_BE.put(buf, 0, -1);
      checkBuffer(buf, "bff0000000000000");
    });

    test("should decode", () => {
      const buf = Buffer.from([0x40, 0x55, 0x48, 0x00, 0x00, 0x00, 0x00, 0x00]);
      expect(Float64_BE.get(buf, 0)).toBe(85.125);
    });
  });

  describe("little-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(8);

      Float64_LE.put(buf, 0, 0);
      checkBuffer(buf, "0000000000000000");

      Float64_LE.put(buf, 0, 85.125);
      checkBuffer(buf, "0000000000485540");

      Float64_LE.put(buf, 0, -1);
      checkBuffer(buf, "000000000000f0bf");
    });

    test("should decode", () => {
      const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x48, 0x55, 0x40]);
      expect(Float64_LE.get(buf, 0)).toBe(85.125);
    });
  });
});

describe("80-bit (extended precision)", () => {
  describe("big-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(10);

      Float80_BE.put(buf, 0, 0);
      checkBuffer(buf, "00000000000000000000");

      Float80_BE.put(buf, 0, 85.125);
      checkBuffer(buf, "4002aa40000000000000");

      Float80_BE.put(buf, 0, -1);
      checkBuffer(buf, "bfff8000000000000000");
    });

    test("should decode", () => {
      const buf = Buffer.from([
        0x40, 0x02, 0xaa, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);
      expect(Float80_BE.get(buf, 0)).toBe(85.125);
    });
  });

  describe("little-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(10);

      Float80_LE.put(buf, 0, 0);
      checkBuffer(buf, "00000000000000000000");

      Float80_LE.put(buf, 0, 85.125);
      checkBuffer(buf, "00000000000040aa0240");

      Float80_LE.put(buf, 0, -1);
      checkBuffer(buf, "0000000000000080ffbf");
    });

    test.skip("should decode", () => {
      const buf = Buffer.from([
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0xaa, 0x02, 0x40,
      ]);
      expect(Float80_LE.get(buf, 0)).toBe(85.125);
    });
  });
});
