import { test, expect } from "vitest";
import { wrapResult } from "./result";

test("result wrap success", () => {
  expect(wrapResult(() => 5)).toEqual([true, 5]);
});

test("result wrap failure", () => {
  const maybeUndefined: string | undefined = undefined;
  const result = wrapResult(() => maybeUndefined.toUpperCase());
  expect(result[0]).toBe(false);
  expect(result[1]).toBeInstanceOf(TypeError);
});

test("result wrap failure with primary", () => {
  const result = wrapResult(() => {
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    throw 42;
  });
  expect(result).toEqual([false, new Error("wrap failure")]);
  expect(result[1].cause).toBe(42);
});
