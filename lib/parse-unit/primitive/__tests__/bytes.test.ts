import { test, expect } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { bytes } from "../bytes";

const buffer = new Uint8Array([
  0x00, 0x01, 0x7f, 0x80, 0xff, 0x81, 0xe6, 0x47, 0x80, 0x6a, 0x5e, 0x4b, 0x2e, 0x63, 0x5a, 0x6d, 0xdd, 0x1d, 0xee,
  0x4e, 0xcd, 0x5f, 0x98, 0xb8,
]);

test("unit: byte array", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, bytes(3))).resolves.toEqual(Uint8Array.of(0x00, 0x01, 0x7f));
  await expect(readUnitFromTokenizer(tokenizer, bytes(3))).resolves.toEqual(Uint8Array.of(0x80, 0xff, 0x81));
  await expect(readUnitFromTokenizer(tokenizer, bytes(3))).resolves.toEqual(Uint8Array.of(0xe6, 0x47, 0x80));
  await expect(readUnitFromTokenizer(tokenizer, bytes(3))).resolves.toEqual(Uint8Array.of(0x6a, 0x5e, 0x4b));
  await expect(readUnitFromTokenizer(tokenizer, bytes(3))).resolves.toEqual(Uint8Array.of(0x2e, 0x63, 0x5a));
  await expect(readUnitFromTokenizer(tokenizer, bytes(3))).resolves.toEqual(Uint8Array.of(0x6d, 0xdd, 0x1d));
});
