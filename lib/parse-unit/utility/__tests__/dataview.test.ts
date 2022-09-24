import { test, expect } from "vitest";

import { dataview } from "../dataview";

const buffer = new Uint8Array([0x00, 0x01, 0x7f, 0x80, 0xff, 0x81]);

test("dataview from buffer", () => {
  expect(dataview(buffer)).toBeInstanceOf(DataView);
  expect(dataview(buffer).buffer).toEqual(buffer.buffer);
  expect(dataview(buffer).byteOffset).toEqual(0);
  expect(dataview(buffer).byteLength).toEqual(6);

  const buffer2 = new Uint8Array(buffer.buffer, 3, 1);

  expect(dataview(buffer2)).toBeInstanceOf(DataView);
  expect(dataview(buffer2).buffer).toEqual(buffer.buffer);
  expect(dataview(buffer2).byteOffset).toEqual(3);
  expect(dataview(buffer2).byteLength).toEqual(1);
});
