import { expect } from "vitest";

export const checkBuffer = (buffer: Uint8Array, expected: string) => {
  expect(Buffer.from(buffer).toString("hex")).toBe(expected);
};
