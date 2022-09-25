import { test, expect } from "vitest";

import { wrapError } from "../wrap-error";

test("wrap error", () => {
  expect(
    wrapError(() => {
      return 50;
    })
  ).toBe(50);

  expect(
    wrapError(() => {
      throw new Error("error");
    })
  ).toEqual(new Error("error"));
});
