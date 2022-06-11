import { assert } from "vitest";

export const checkBuffer = (uint8Array: Uint8Array, hexStr: string) => {
  assert.equal(Buffer.from(uint8Array).toString("hex"), hexStr);
};
