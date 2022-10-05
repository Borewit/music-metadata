import { test, expect } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { skip } from "../../primitive/skip";
import { latin1 } from "../../primitive/string";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { sequenceMap } from "../sequence-map";

const buffer = new Uint8Array([
  0x00, 0x01, 0x7f, 0x80, 0xff, 0x81, 0xe6, 0x47, 0x80, 0x6a, 0x5e, 0x4b, 0x2e, 0x63, 0x5a, 0x6d, 0xdd, 0x1d, 0xee,
  0x4e, 0xcd, 0x5f, 0x98, 0xb8,
]);

test("unit: units sequence and map", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  const result: Promise<string> = readUnitFromTokenizer(
    tokenizer,
    sequenceMap(
      u8,
      latin1(2),
      skip(3),
      u8,
      (first, second, third, fourth) => `1: ${first}, 2: ${second}, 3: ${typeof third}, 4: ${fourth}`
    )
  );
  await expect(result).resolves.toBe("1: 0, 2: \u0001\u007F, 3: undefined, 4: 230");

  const result2: Promise<string> = readUnitFromTokenizer(
    tokenizer,
    sequenceMap(
      u8,
      skip(3),
      latin1(5),
      u8,
      (first, second, third, fourth) => `1: ${first}, 2: ${typeof second}, 3: ${third}, 4: ${fourth}`
    )
  );

  await expect(result2).resolves.toBe("1: 71, 2: undefined, 3: \u004B\u002E\u0063\u005A\u006D, 4: 221");
});
