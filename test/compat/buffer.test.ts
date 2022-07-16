import { expect, test } from "vitest";

import { indexOf, isSubArray, readUintBE } from "../../lib/compat/buffer";

test("uint8array is subarray", () => {
  const source = Uint8Array.of(1, 2, 3, 2, 3, 4, 1, 2, 3);

  expect(isSubArray(source, Uint8Array.of())).toBe(true);
  expect(isSubArray(source, Uint8Array.of(1, 2, 3))).toBe(true);
  expect(isSubArray(source, Uint8Array.of(2, 3, 4))).toBe(true);
  expect(isSubArray(source, Uint8Array.of(3, 4, 5))).toBe(false);

  expect(isSubArray(source, Uint8Array.of(1, 2, 3), 5)).toBe(true);
  expect(isSubArray(source, Uint8Array.of(2, 3, 4), 5)).toBe(false);
  expect(isSubArray(source, Uint8Array.of(3, 4, 5), 5)).toBe(false);
});

test("uint8array index of", () => {
  const source = Uint8Array.of(1, 2, 3, 2, 3, 4, 1, 2, 3);

  expect(indexOf(source, Uint8Array.of())).toBe(0);
  expect(indexOf(source, Uint8Array.of(1, 2, 3))).toBe(0);
  expect(indexOf(source, Uint8Array.of(2, 3, 4))).toBe(3);
  expect(indexOf(source, Uint8Array.of(3, 4, 5))).toBe(-1);

  expect(indexOf(source, Uint8Array.of(1, 2, 3), 5)).toBe(6);
  expect(indexOf(source, Uint8Array.of(2, 3, 4), 5)).toBe(-1);
  expect(indexOf(source, Uint8Array.of(3, 4, 5), 5)).toBe(-1);
});

test("uint8array index of", () => {
  const source = Uint8Array.of(1, 2, 3, 2, 3, 4, 1, 2, 3);
  expect(readUintBE(source, 0, 1)).toBe(0x01);
  expect(readUintBE(source, 0, 2)).toBe(0x01_02);
  expect(readUintBE(source, 0, 3)).toBe(0x01_02_03);
  expect(readUintBE(source, 0, 4)).toBe(0x01_02_03_02);
  expect(readUintBE(source, 0, 5)).toBe(0x01_02_03_02_03);
  expect(readUintBE(source, 0, 6)).toBe(0x01_02_03_02_03_04);

  expect(readUintBE(source, 1, 5)).toBe(0x02_03_02_03_04);
  expect(readUintBE(source, 4, 5)).toBe(0x03_04_01_02_03);
});
