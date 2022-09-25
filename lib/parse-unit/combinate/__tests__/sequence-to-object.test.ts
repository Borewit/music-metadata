import { test, expect } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { skip } from "../../primitive/skip";
import { latin1 } from "../../primitive/string";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { sequenceToObject } from "../sequence-to-object";

const buffer = new Uint8Array([
  0x00, 0x01, 0x7f, 0x80, 0xff, 0x81, 0xe6, 0x47, 0x80, 0x6a, 0x5e, 0x4b, 0x2e, 0x63, 0x5a, 0x6d, 0xdd, 0x1d, 0xee,
  0x4e, 0xcd, 0x5f, 0x98, 0xb8,
]);

test("unit: units sequence", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  const result: Promise<{
    first: number;
    second: string;
    third: undefined;
    fourth: number;
  }> = readUnitFromTokenizer(
    tokenizer,
    sequenceToObject({ first: 0, second: 1, third: 2, fourth: 3 }, u8, latin1(2), skip(3), u8)
  );
  await expect(result).resolves.toEqual({ first: 0x00, second: "\u0001\u007F", third: undefined, fourth: 0xe6 });

  const result2: Promise<{
    first: number;
    second: undefined;
    third: string;
    fourth: number;
  }> = readUnitFromTokenizer(
    tokenizer,
    sequenceToObject({ first: 0, second: 1, third: 2, fourth: 3 }, u8, skip(3), latin1(5), u8)
  );

  await expect(result2).resolves.toEqual({
    first: 0x47,
    second: undefined,
    third: "\u004B\u002E\u0063\u005A\u006D",
    fourth: 0xdd,
  });
});
