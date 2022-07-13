import { expect, test } from "vitest";
import { getUint8ArrayFromBase64String as f1 } from "./index";
import { getUint8ArrayFromBase64String as f2 } from "./index";

test.each([f1, f2])("get Uint8Array from base64 string", async (f) => {
  const source = "AQIDBAU=";
  const expected = Uint8Array.of(1, 2, 3, 4, 5);
  const actual = await f(source);

  expect(actual).toBeInstanceOf(Uint8Array);
  expect(actual).toEqual(expected);
});
