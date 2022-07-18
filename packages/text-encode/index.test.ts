import { expect, test } from "vitest";
import { TextEncoder, TextDecoder } from "./index";

test("get Uint8Array from base64 string", () => {
  const source = "Hello";
  const expected = Uint8Array.of(72, 101, 108, 108, 111);
  const actual = new TextEncoder().encode(source);

  expect(actual).toEqual(expected);
});

test("get Uint8Array from base64 string", () => {
  const source = Uint8Array.of(72, 101, 108, 108, 111);
  const expected = "Hello";
  const actual = new TextDecoder().decode(source);

  expect(actual).toEqual(expected);
});
