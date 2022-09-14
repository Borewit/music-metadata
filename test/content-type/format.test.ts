/* eslint-disable unicorn/text-encoding-identifier-case */
import { describe, test, expect } from "vitest";

import { format } from "../../lib/content-type";

describe("contentType.format(obj)", function () {
  test("should format basic type", function () {
    const str = format({ type: "text/html" });
    expect(str).toBe("text/html");
  });

  test("should format type with suffix", function () {
    const str = format({ type: "image/svg+xml" });
    expect(str).toBe("image/svg+xml");
  });

  test("should format type with parameter", function () {
    const str = format({
      type: "text/html",
      parameters: { charset: "utf-8" },
    });
    expect(str).toBe("text/html; charset=utf-8");
  });

  test("should format type with parameter that needs quotes", function () {
    const str = format({
      type: "text/html",
      parameters: { foo: 'bar or "baz"' },
    });
    expect(str).toBe('text/html; foo="bar or \\"baz\\""');
  });

  test("should format type with parameter with empty value", function () {
    const str = format({
      type: "text/html",
      parameters: { foo: "" },
    });
    expect(str).toBe('text/html; foo=""');
  });

  test("should format type with multiple parameters", function () {
    const str = format({
      type: "text/html",
      parameters: { charset: "utf-8", foo: "bar", bar: "baz" },
    });
    expect(str).toBe("text/html; bar=baz; charset=utf-8; foo=bar");
  });

  test("should require argument", function () {
    expect(() => (format as unknown as (n?: unknown) => void)(), "argument obj is required").toThrow();
  });

  test("should reject non-objects", function () {
    expect(() => (format as unknown as (n?: unknown) => void)(7), "argument obj is required").toThrow();
  });

  test("should require type", function () {
    const obj = {};
    expect(() => (format as unknown as (n?: unknown) => void)(obj), "invalid type").toThrow();
  });

  test("should reject invalid type", function () {
    const obj = { type: "text/" };
    expect(() => (format as unknown as (n?: unknown) => void)(obj), "invalid type").toThrow();
  });

  test("should reject invalid type with LWS", function () {
    const obj = { type: " text/html" };
    expect(() => (format as unknown as (n?: unknown) => void)(obj), "invalid type").toThrow();
  });

  test("should reject invalid parameter name", function () {
    const obj = { type: "image/svg", parameters: { "foo/": "bar" } };
    expect(() => (format as unknown as (n?: unknown) => void)(obj), "invalid parameter name").toThrow();
  });

  test("should reject invalid parameter value", function () {
    const obj = { type: "image/svg", parameters: { foo: "bar\u0000" } };
    expect(() => (format as unknown as (n?: unknown) => void)(obj), "invalid parameter name").toThrow();
  });
});
