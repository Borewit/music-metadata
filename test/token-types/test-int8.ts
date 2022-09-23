// Test reading int8 values.

import { describe, test, expect } from "vitest";

import { INT8 } from "../../lib/token-types";

import { checkBuffer } from "./util";

describe("Parse 8-bit signed integer (INT8)", () => {
  test("should encode", () => {
    const buf = Buffer.alloc(1);

    INT8.put(buf, 0, 0x00);
    checkBuffer(buf, "00");

    INT8.put(buf, 0, 0x22);
    checkBuffer(buf, "22");

    INT8.put(buf, 0, -0x22);
    checkBuffer(buf, "de");
  });

  test("should decode", () => {
    const buf = Buffer.from([0x00, 0x7f, 0x80, 0xff, 0x81]);

    expect(INT8.get(buf, 0)).toBe(0);
    expect(INT8.get(buf, 1)).toBe(127);
    expect(INT8.get(buf, 2)).toBe(-128);
    expect(INT8.get(buf, 3)).toBe(-1);
    expect(INT8.get(buf, 4)).toBe(-127);
  });
});
