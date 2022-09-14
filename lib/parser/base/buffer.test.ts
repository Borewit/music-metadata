import { test, expect } from "vitest";

import { readBuffer } from "./buffer";

test("decode uint8array", () => {
  const buffer = new Uint8Array([0x00, 0x01, 0x7f, 0x80, 0xff, 0x81]);

  expect(readBuffer(buffer, 0, 2)).toEqual(Uint8Array.of(0x00, 0x01));
  expect(readBuffer(buffer, 2, 0)).toEqual(Uint8Array.of());
  expect(readBuffer(buffer, 2, 1)).toEqual(Uint8Array.of(0x7f));
  expect(readBuffer(buffer, 3, 3)).toEqual(Uint8Array.of(0x80, 0xff, 0x81));
});
