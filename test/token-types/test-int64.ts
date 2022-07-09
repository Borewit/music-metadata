// Test reading int64 values.

import { describe, test, expect } from "vitest";
import { INT64_BE, INT64_LE } from "../../lib/token-types";
import { checkBuffer } from "./util";

describe("Parse 64-bit signed integer", () => {
  describe("big-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(8);

      INT64_BE.put(buf, 0, 0x00_00_00_00_00_00_00_01n);
      checkBuffer(buf, "0000000000000001");

      INT64_BE.put(buf, 0, 0x00_00_ff_bb_ee_dd_cc_aan);
      checkBuffer(buf, "0000ffbbeeddccaa");

      INT64_BE.put(buf, 0, -1n);
      checkBuffer(buf, "ffffffffffffffff");
    });

    test("should decode", () => {
      let buf: Buffer;

      buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
      expect(INT64_BE.get(buf, 0)).toBe(0n);

      buf = Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
      expect(INT64_BE.get(buf, 0)).toBe(-1n);

      buf = Buffer.from([0x00, 0x00, 0xff, 0xbb, 0xee, 0xdd, 0xcc, 0xaa]);
      expect(INT64_BE.get(buf, 0)).toBe(0x00_00_ff_bb_ee_dd_cc_aan);

      buf = Buffer.from([0x00, 0x00, 0xff, 0xbb, 0xee, 0xdd, 0xcc, 0xbb]);
      expect(INT64_BE.get(buf, 0)).toBe(0x00_00_ff_bb_ee_dd_cc_bbn);
    });
  });

  describe("little-endian", () => {
    test("should encode", () => {
      const buf = Buffer.alloc(8);

      INT64_LE.put(buf, 0, 0x00_00_00_00_00_00_00_00n);
      checkBuffer(buf, "0000000000000000");

      INT64_LE.put(buf, 0, 0x00_00_ff_bb_ee_dd_cc_aan);
      checkBuffer(buf, "aaccddeebbff0000");

      INT64_LE.put(buf, 0, -1n);
      checkBuffer(buf, "ffffffffffffffff");
    });

    test("should decode", () => {
      let buf: Buffer;

      buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
      expect(INT64_LE.get(buf, 0)).toBe(0n);

      buf = Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
      expect(INT64_LE.get(buf, 0)).toBe(-1n);

      buf = Buffer.from([0xaa, 0xcc, 0xdd, 0xee, 0xbb, 0xff, 0x00, 0x00]);
      expect(INT64_LE.get(buf, 0)).toBe(0x00_00_ff_bb_ee_dd_cc_aan);

      buf = Buffer.from([0xbb, 0xcc, 0xdd, 0xee, 0xbb, 0xff, 0x00, 0x00]);
      expect(INT64_LE.get(buf, 0)).toBe(0x00_00_ff_bb_ee_dd_cc_bbn);
    });
  });
});
