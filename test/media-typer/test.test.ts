import { describe, expect, it } from "vitest";
import { format, parse, test } from "../../lib/media-typer";

const invalidTypes = [
  " ",
  "null",
  "undefined",
  "/",
  "text/;plain",
  'text/"plain"',
  "text/p£ain",
  "text/(plain)",
  "text/@plain",
  "text/plain,wrong",
];

describe("typer.format(obj)", function () {
  it("should format basic type", function () {
    const str = format({ type: "text", subtype: "html" });
    expect(str).toBe("text/html");
  });

  it("should format type with suffix", function () {
    const str = format({ type: "image", subtype: "svg", suffix: "xml" });
    expect(str).toBe("image/svg+xml");
  });

  it("should require argument", function () {
    expect(() => (format as unknown as (n?: unknown) => void)(), "obj.*required").toThrow();
  });

  it("should reject non-objects", function () {
    expect(() => (format as unknown as (n?: unknown) => void)(7), "obj.*required").toThrow();
  });

  it("should require type", function () {
    expect(() => (format as unknown as (n?: unknown) => void)({}), "invalid type").toThrow();
  });

  it("should reject invalid type", function () {
    expect(() => (format as unknown as (n?: unknown) => void)({ type: "text/" }), "invalid type").toThrow();
  });

  it("should require subtype", function () {
    expect(() => (format as unknown as (n?: unknown) => void)({ type: "text" }), "invalid subtype").toThrow();
  });

  it("should reject invalid subtype", function () {
    const obj = { type: "text", subtype: "html/" };
    expect(() => (format as unknown as (n?: unknown) => void)(obj), "invalid subtype").toThrow();
  });

  it("should reject invalid suffix", function () {
    const obj = { type: "image", subtype: "svg", suffix: "xml\\" };
    expect(() => (format as unknown as (n?: unknown) => void)(obj), "invalid suffix").toThrow();
  });
});

describe("typer.parse(string)", function () {
  it("should parse basic type", function () {
    const type = parse("text/html");
    expect(type.type).toBe("text");
    expect(type.subtype).toBe("html");
  });

  it("should parse with suffix", function () {
    const type = parse("image/svg+xml");
    expect(type.type).toBe("image");
    expect(type.subtype).toBe("svg");
    expect(type.suffix).toBe("xml");
  });

  it("should lower-case type", function () {
    const type = parse("IMAGE/SVG+XML");
    expect(type.type).toBe("image");
    expect(type.subtype).toBe("svg");
    expect(type.suffix).toBe("xml");
  });

  it.each(invalidTypes)("should throw on invalid media type %s", function (type) {
    expect(() => (parse as unknown as (n?: unknown) => void)(type), "invalid media type").toThrow();
  });

  it("should require argument", function () {
    expect(() => (parse as unknown as (n?: unknown) => void)(), "string.*required").toThrow();
  });

  it("should reject non-strings", function () {
    expect(() => (parse as unknown as (n?: unknown) => void)(7), "string.*required").toThrow();
  });
});

describe("typer.test(string)", function () {
  it("should pass basic type", function () {
    expect(test("text/html")).toBe(true);
  });

  it("should pass with suffix", function () {
    expect(test("image/svg+xml")).toBe(true);
  });

  it("should pass upper-case type", function () {
    expect(test("IMAGE/SVG+XML")).toBe(true);
  });

  it.each(invalidTypes)("should fail invalid media type %s", function (type) {
    expect(test(type)).toBe(false);
  });

  it("should require argument", function () {
    expect(() => (test as unknown as (n?: unknown) => void)(), "string.*required").toThrow();
  });

  it("should reject non-strings", function () {
    expect(() => (test as unknown as (n?: unknown) => void)(7), "string.*required").toThrow();
  });
});
