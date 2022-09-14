// Test writing and reading uint8 values.

import { describe, test, expect } from "vitest";

import { UINT8 } from "../../lib/token-types";

import { checkBuffer } from "./util";

describe("Parse 8-bit unsigned integer (UINT8)", () => {
  test("should encode", () => {
    const buf = Buffer.alloc(1);

    UINT8.put(buf, 0, 0x00);
    checkBuffer(buf, "00");

    UINT8.put(buf, 0, 0x22);
    checkBuffer(buf, "22");

    UINT8.put(buf, 0, 0xff);
    checkBuffer(buf, "ff");
  });

  test("should decode", () => {
    const buf = Buffer.from([0x00, 0x1a, 0x01, 0xff]);

    expect(UINT8.get(buf, 0)).toBe(0);
    expect(UINT8.get(buf, 1)).toBe(26);
    expect(UINT8.get(buf, 2)).toBe(1);
    expect(UINT8.get(buf, 3)).toBe(255);
  });
});
