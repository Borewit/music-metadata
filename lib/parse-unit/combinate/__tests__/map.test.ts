import { test, expect } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { map } from "../map";

const buffer = new Uint8Array([
  0x00, 0x01, 0x7f, 0x80, 0xff, 0x81, 0xe6, 0x47, 0x80, 0x6a, 0x5e, 0x4b, 0x2e, 0x63, 0x5a, 0x6d, 0xdd, 0x1d, 0xee,
  0x4e, 0xcd, 0x5f, 0x98, 0xb8,
]);

test("unit: map unit result", async () => {
  const tokenizer = new BufferTokenizer(buffer);
  const unit = map(u8, (n) => String(5 + n * 2));

  await expect(readUnitFromTokenizer(tokenizer, unit)).resolves.toEqual("5");
  await expect(readUnitFromTokenizer(tokenizer, unit)).resolves.toEqual("7");
  await expect(readUnitFromTokenizer(tokenizer, unit)).resolves.toEqual("259");
});
