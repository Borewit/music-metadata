import { expect, test } from "vitest";
import { getUint8ArrayFromBase64String } from "./index";

test("get Uint8Array from base64 string", async () => {
  const source = "AQIDBAU=";
  const expected = Uint8Array.of(1, 2, 3, 4, 5);
  const actual = await getUint8ArrayFromBase64String(source);

  expect(actual).toBeInstanceOf(Uint8Array);
  expect(actual).toEqual(expected);
});
