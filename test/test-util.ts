import { assert } from "chai";

import * as util from "../lib/common/Util";
import { FourCcToken } from "../lib/common/FourCC";

const t = assert;

describe("shared utility functionality", () => {
  describe("find zero", () => {
    const findZero = util.findZero;

    it("should find terminator in ascii encoded string", () => {
      const buf = Buffer.from([0xff, 0xff, 0xff, 0x00]);
      t.equal(findZero(buf, 0, buf.length, "ascii"), 3);
    });

    it("find terminator in middle of ascii encoded string", () => {
      const buf = Buffer.from([0xff, 0xff, 0x00, 0xff, 0xff]);
      t.equal(findZero(buf, 0, buf.length, "ascii"), 2);
    });

    it("return offset to end if nothing is found", () => {
      const buf = Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff]);
      t.equal(findZero(buf, 0, buf.length, "ascii"), buf.length);
    });

    it("find terminator in utf16le encoded string", () => {
      const buf = Buffer.from([
        0x68, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00, 0x6f, 0x00, 0x00, 0x00,
      ]);
      t.equal(findZero(buf, 0, buf.length, "utf16le"), 10);
    });

    it("find terminator in utf16be encoded string", () => {
      const buf = Buffer.from([
        0x00, 0x68, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00, 0x00,
      ]);
      t.equal(findZero(buf, 0, buf.length, "utf16le"), 8);
    });
  });

  describe("stripNulls", () => {
    it("should strip nulls", () => {
      const tests = [
        {
          str: "foo",
          expected: "foo",
        },
        {
          str: "derp\x00\x00",
          expected: "derp",
        },
        {
          str: "\x00\x00harkaaa\x00",
          expected: "harkaaa",
        },
        {
          str: "\x00joystick",
          expected: "joystick",
        },
      ];
      tests.forEach((test) => {
        t.strictEqual(util.stripNulls(test.str), test.expected);
      });
    });
  });

  describe("FourCC token", () => {
    const testData: { fourCC: string; valid: boolean }[] = [
      { fourCC: "\x00\x00\x00\x00", valid: false },
      { fourCC: "WAVE", valid: true },
      { fourCC: "fmt ", valid: true },
      { fourCC: "fmt\x00", valid: true },
      { fourCC: "----", valid: true }, // Used in MP4
      { fourCC: "-\x00\x00\x00", valid: true }, // Used in MP4
      { fourCC: "©nam", valid: true }, // Used in MP4
      { fourCC: "(c) ", valid: true }, // Used in AIFF
      { fourCC: " XML", valid: false },
      { fourCC: " XM ", valid: false },
    ];

    it("should only accept a valid identifier, otherwise is should throw an error", () => {
      for (const data of testData) {
        const buf = Buffer.from(data.fourCC, "ascii");

        let valid;
        let fourCC;
        try {
          fourCC = FourCcToken.get(buf, 0);
          valid = true;
        } catch (e) {
          valid = false;
        }
        t.strictEqual(
          valid,
          data.valid,
          `FourCC: ${util.a2hex(data.fourCC)} "${data.fourCC}"`
        );
        if (data.valid) {
          t.strictEqual(fourCC, data.fourCC);
        }
      }
    });

    it("should be able to encode FourCC token", () => {
      const buffer = Buffer.alloc(4);
      FourCcToken.put(buffer, 0, "abcd");
      t.deepEqual(buffer.toString("binary"), "abcd");
    });
  });

  it("a2hex", () => {
    t.equal(util.a2hex("\x00\x01ABC\x02"), "00 01 41 42 43 02");
  });
});
