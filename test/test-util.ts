import { describe, test, expect } from "vitest";

import { findZero, stripNulls, a2hex } from "../lib/common/Util";
import { FourCcToken } from "../lib/common/FourCC";

describe("find zero", () => {
  const cases: ["ascii" | "utf16le", number[], number][] = [
    ["ascii", [0xff, 0xff, 0xff, 0x00], 3],
    ["ascii", [0xff, 0xff, 0x00, 0xff, 0xff], 2],
    ["ascii", [0xff, 0xff, 0xff, 0xff, 0xff], 5],
    [
      "utf16le",
      [0x68, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00, 0x6f, 0x00, 0x00, 0x00],
      10,
    ],
    [
      "utf16le",
      [0x00, 0x68, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00, 0x00],
      8,
    ],
  ];

  test.each(cases)(
    "find terminator in %s encoded",
    (encoding, data, expected) => {
      const buf = Buffer.from(data);
      const actual = findZero(buf, 0, buf.length, encoding);
      expect(actual).toBe(expected);
    }
  );
});

describe("strip nulls", () => {
  const cases: [string, string][] = [
    ["foo", "foo"],
    ["derp\u0000\u0000", "derp"],
    ["\u0000\u0000harkaaa\u0000", "harkaaa"],
    ["\u0000joystick", "joystick"],
  ];

  test.each(cases)("strip nulls %j -> %s", (str, expected) => {
    const actual = stripNulls(str);
    expect(actual).toBe(expected);
  });
});

describe("FourCC token", () => {
  const validCases: string[] = [
    "WAVE",
    "fmt ",
    "fmt\u0000",
    "----", // Used in MP4
    "-\u0000\u0000\u0000", // Used in MP4
    "©nam", // Used in MP4
    "(c) ", // Used in AIFF
  ];

  const invalidCases: string[] = ["\u0000\u0000\u0000\u0000", " XML", " XM "];

  test.each(validCases)("%j is accept valid identifier", (data) => {
    const buf = Buffer.from(data, "ascii");
    const actual = FourCcToken.get(buf, 0);
    expect(actual).toBe(data);
  });

  test.each(invalidCases)("%j is throw an error", (data) => {
    const buf = Buffer.from(data, "ascii");
    expect(() => FourCcToken.get(buf, 0)).toThrowError();
  });

  test("should be able to encode FourCC token", () => {
    const buffer = Buffer.alloc(4);
    FourCcToken.put(buffer, 0, "abcd");
    expect(buffer.toString("binary")).toBe("abcd");
  });
});

test("a2hex", () => {
  const actual = a2hex("\u0000\u0001ABC\u0002");
  expect(actual).toBe("00 01 41 42 43 02");
});
