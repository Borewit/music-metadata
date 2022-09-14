import { describe, expect, test } from "vitest";

import {
  getBase64StringFromUint8Array,
  getBase64UrlStringFromUint8Array,
  getUint8ArrayFromBase64String,
  getUint8ArrayFromBase64UrlString,
} from "../../lib/compat/base64";

const uint8array = Uint8Array.of(3, 224, 127, 115, 231, 127, 16);
const base64 = "A+B/c+d/EA==";
const base64url = "A-B_c-d_EA";

describe("base64 encode", () => {
  test("uint8array -> base64", () => {
    const actual = getBase64StringFromUint8Array(uint8array);
    expect(actual).toBe(base64);
  });

  test("uint8array -> base64 url", () => {
    const actual = getBase64UrlStringFromUint8Array(uint8array);
    expect(actual).toBe(base64url);
  });
});

describe("base64 decode", () => {
  test("base64 -> uint8array", () => {
    const actual = getUint8ArrayFromBase64String(base64);
    expect(actual).toEqual(uint8array);
  });

  test("base64 url -> uint8array", () => {
    const actual = getUint8ArrayFromBase64UrlString(base64url);
    expect(actual).toEqual(uint8array);
  });
});
