import { expect, test } from "vitest";

import { fromHexString, toHexString } from "../../lib/compat/hex";

const uint8array = Uint8Array.of(0x00, 0x01, 0x11, 0xaa, 0xff);
const hex = "000111aaff";

test("uint8array is subarray", () => {
  expect(toHexString(uint8array)).toBe(hex);
  expect(fromHexString(hex)).toEqual(uint8array);
});
