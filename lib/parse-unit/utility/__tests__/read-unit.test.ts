import { test, expect } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnitFromTokenizer, peekUnitFromTokenizer, readUnitFromBuffer } from "../read-unit";

const buffer = new Uint8Array([0x00, 0x01, 0x7f, 0x80, 0xff, 0x81]);

test("read unit from tokenizer", () => {
  expect(readUnitFromBuffer(u8, buffer, 0)).toBe(0x00);
  expect(readUnitFromBuffer(u8, buffer, 1)).toBe(0x01);
  expect(readUnitFromBuffer(u8, buffer, 2)).toBe(0x7f);
  expect(readUnitFromBuffer(u8, buffer, 3)).toBe(0x80);
  expect(readUnitFromBuffer(u8, buffer, 4)).toBe(0xff);
  expect(readUnitFromBuffer(u8, buffer, 5)).toBe(0x81);
});

test("read unit from tokenizer", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, u8)).resolves.toBe(0x00);
  await expect(readUnitFromTokenizer(tokenizer, u8)).resolves.toBe(0x01);
  await expect(readUnitFromTokenizer(tokenizer, u8)).resolves.toBe(0x7f);
  await expect(readUnitFromTokenizer(tokenizer, u8)).resolves.toBe(0x80);
  await expect(readUnitFromTokenizer(tokenizer, u8)).resolves.toBe(0xff);
  await expect(readUnitFromTokenizer(tokenizer, u8)).resolves.toBe(0x81);
  await expect(readUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
});

test("peek unit from tokenizer", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(peekUnitFromTokenizer(tokenizer, u8)).resolves.toBe(0x00);
  await expect(peekUnitFromTokenizer(tokenizer, u8)).resolves.toBe(0x00);
  await expect(peekUnitFromTokenizer(tokenizer, u8)).resolves.toBe(0x00);
  await expect(readUnitFromTokenizer(tokenizer, u8)).resolves.toBe(0x00);

  await expect(peekUnitFromTokenizer(tokenizer, u8)).resolves.toBe(0x01);

  await expect(readUnitFromTokenizer(tokenizer, u8)).resolves.toBe(0x01);
  await expect(readUnitFromTokenizer(tokenizer, u8)).resolves.toBe(0x7f);
  await expect(readUnitFromTokenizer(tokenizer, u8)).resolves.toBe(0x80);
  await expect(readUnitFromTokenizer(tokenizer, u8)).resolves.toBe(0xff);
  await expect(readUnitFromTokenizer(tokenizer, u8)).resolves.toBe(0x81);

  await expect(peekUnitFromTokenizer(tokenizer, u8)).rejects.toThrow();
});
