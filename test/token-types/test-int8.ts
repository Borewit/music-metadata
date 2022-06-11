// Test reading int8 values.

import { describe, assert, it } from "vitest";
import * as Token from "../../lib/token-types";
import * as util from "./util";

describe("Parse 8-bit signed integer (INT8)", () => {
  it("should encode", () => {
    const buf = Buffer.alloc(1);

    Token.INT8.put(buf, 0, 0x00);
    util.checkBuffer(buf, "00");

    Token.INT8.put(buf, 0, 0x22);
    util.checkBuffer(buf, "22");

    Token.INT8.put(buf, 0, -0x22);
    util.checkBuffer(buf, "de");
  });

  it("should decode", () => {
    const buf = Buffer.from("\x00\x7f\x80\xff\x81", "binary");

    assert.strictEqual(Token.INT8.get(buf, 0), 0);
    assert.strictEqual(Token.INT8.get(buf, 1), 127);
    assert.strictEqual(Token.INT8.get(buf, 2), -128);
    assert.strictEqual(Token.INT8.get(buf, 3), -1);
    assert.strictEqual(Token.INT8.get(buf, 4), -127);
  });
});
