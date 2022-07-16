import { describe, test, expect } from "vitest";
import { BufferType, Uint8ArrayType } from "../../lib/token-types";
import { Utf8StringType } from "../../lib/token-types/string";

describe("BufferType", () => {
  test("Should copy data fom the source array", () => {
    const source = Buffer.from([0xa1, 0xa2, 0xb1, 0xb2, 0xc1, 0xc2]);

    const bufferTypeToken = new BufferType(2);
    const bufferResult = bufferTypeToken.get(source, 2);

    expect(bufferResult, "should be 2 middle bytes: 0xb1, 0xb2").toEqual(Buffer.from([0xb1, 0xb2]));

    // Overwrite the result
    bufferResult[0] = 0xd1;
    bufferResult[1] = 0xd2;

    expect(source, "should copy the data").not.toEqual(Buffer.from([0xa1, 0xa2, 0xd1, 0xd2, 0xc1, 0xc2]));
  });
});

describe("Uint8ArrayType", () => {
  test("should should not copy data fom the source array", () => {
    const source = Uint8Array.from([0xa1, 0xa2, 0xb1, 0xb2, 0xc1, 0xc2]);

    const uint8ArrayType = new Uint8ArrayType(2);
    const bufferResult = uint8ArrayType.get(source, 2);

    expect(bufferResult, "should be 2 middle bytes: 0xb1, 0xb2").toEqual(Uint8Array.from([0xb1, 0xb2]));

    // Overwrite the result
    bufferResult[0] = 0xd1;
    bufferResult[1] = 0xd2;

    expect(source, "should not copy the data").toEqual(Uint8Array.from([0xa1, 0xa2, 0xd1, 0xd2, 0xc1, 0xc2]));
  });
});

describe("StringType", () => {
  test("decode from Buffer", () => {
    const source = new Uint8Array(Buffer.from("peter", "utf8"));

    const stringType = new Utf8StringType(5);

    expect(stringType.get(source, 0), "should be 2 middle bytes: 0xb1, 0xb2").toBe("peter");
  });
});
