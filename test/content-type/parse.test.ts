/* eslint-disable unicorn/text-encoding-identifier-case */
import { describe, test, expect } from "vitest";
import { parse } from "../../lib/content-type";

describe("contentType.parse(string)", function () {
  test("should parse basic type", function () {
    const type = parse("text/html");
    expect(type.type).toBe("text/html");
  });

  test("should parse with suffix", function () {
    const type = parse("image/svg+xml");
    expect(type.type).toBe("image/svg+xml");
  });

  test("should parse basic type with surrounding OWS", function () {
    const type = parse(" text/html ");
    expect(type.type).toBe("text/html");
  });

  test("should parse parameters", function () {
    const type = parse("text/html; charset=utf-8; foo=bar");
    expect(type.type).toBe("text/html");
    expect(type.parameters).toEqual({
      charset: "utf-8",
      foo: "bar",
    });
  });

  test("should parse parameters with extra LWS", function () {
    const type = parse("text/html ; charset=utf-8 ; foo=bar");
    expect(type.type).toBe("text/html");
    expect(type.parameters).toEqual({
      charset: "utf-8",
      foo: "bar",
    });
  });

  test("should lower-case type", function () {
    const type = parse("IMAGE/SVG+XML");
    expect(type.type).toBe("image/svg+xml");
  });

  test("should lower-case parameter names", function () {
    const type = parse("text/html; Charset=UTF-8");
    expect(type.type).toBe("text/html");
    expect(type.parameters).toEqual({
      charset: "UTF-8",
    });
  });

  test("should unquote parameter values", function () {
    const type = parse('text/html; charset="UTF-8"');
    expect(type.type).toBe("text/html");
    expect(type.parameters).toEqual({
      charset: "UTF-8",
    });
  });

  test("should unquote parameter values with escapes", function () {
    const type = parse('text/html; charset = "UT\\F-\\\\\\"8\\""');
    expect(type.type).toBe("text/html");
    expect(type.parameters).toEqual({
      charset: 'UTF-\\"8"',
    });
  });

  test("should handle balanced quotes", function () {
    const type = parse('text/html; param="charset=\\"utf-8\\"; foo=bar"; bar=foo');
    expect(type.type).toBe("text/html");
    expect(type.parameters).toEqual({
      param: 'charset="utf-8"; foo=bar',
      bar: "foo",
    });
  });

  const invalidTypes = [
    " ",
    "null",
    "undefined",
    "/",
    "text / plain",
    "text/;plain",
    'text/"plain"',
    "text/p£ain",
    "text/(plain)",
    "text/@plain",
    "text/plain,wrong",
  ];

  test.each(invalidTypes)("should throw on invalid media type %s", function (type) {
    expect(() => (parse as unknown as (n?: unknown) => void)(type), "invalid media type").toThrow();
  });

  test("should throw on invalid parameter format", function () {
    expect(() => parse('text/plain; foo="bar'), "invalid parameter format").toThrow();
    expect(() => parse("text/plain; profile=http://localhost; foo=bar"), "invalid parameter format").toThrow();
    expect(() => parse("text/plain; profile=http://localhost"), "invalid parameter format").toThrow();
  });

  test("should require argument", function () {
    expect(() => (parse as unknown as (n?: unknown) => void)(), "string.*required").toThrow();
  });

  test("should reject non-strings", function () {
    expect(() => (parse as unknown as (n?: unknown) => void)(7), "string.*required").toThrow();
  });
});

describe("contentType.parse(req)", function () {
  test("should parse content-type header", function () {
    const req = { headers: { "content-type": "text/html" } };
    const type = parse(req);
    expect(type.type).toBe("text/html");
  });

  test("should reject objects without headers property", function () {
    expect(() => (parse as unknown as (n?: unknown) => void)({}), "content-type header is missing").toThrow();
  });

  test("should reject missing content-type", function () {
    const req = { headers: {} };
    expect(() => (parse as unknown as (n?: unknown) => void)(req), "content-type header is missing").toThrow();
  });
});

describe("contentType.parse(res)", function () {
  test("should parse content-type header", function () {
    const res = {
      getHeader() {
        return "text/html";
      },
    };
    const type = parse(res);
    expect(type.type).toBe("text/html");
  });

  test("should reject objects without getHeader method", function () {
    expect(() => (parse as unknown as (n?: unknown) => void)({}), "content-type header is missing").toThrow();
  });

  test("should reject missing content-type", function () {
    const res = {
      getHeader() {
        // empty
      },
    };
    expect(() => (parse as unknown as (n?: unknown) => void)(res), "content-type header is missing").toThrow();
  });
});
