import { test, expect } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { u8 } from "../../primitive/integer";
import { readUnit, peekUnit } from "../read-unit";

const buffer = new Uint8Array([0x00, 0x01, 0x7f, 0x80, 0xff, 0x81]);

test("read unit from tokenizer", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnit(tokenizer, u8)).resolves.toBe(0x00);
  await expect(readUnit(tokenizer, u8)).resolves.toBe(0x01);
  await expect(readUnit(tokenizer, u8)).resolves.toBe(0x7f);
  await expect(readUnit(tokenizer, u8)).resolves.toBe(0x80);
});

test("peek unit from tokenizer", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(peekUnit(tokenizer, u8)).resolves.toBe(0x00);
  await expect(peekUnit(tokenizer, u8)).resolves.toBe(0x00);
  await expect(peekUnit(tokenizer, u8)).resolves.toBe(0x00);
  await expect(readUnit(tokenizer, u8)).resolves.toBe(0x00);

  await expect(peekUnit(tokenizer, u8)).resolves.toBe(0x01);
  await expect(readUnit(tokenizer, u8)).resolves.toBe(0x01);

  await expect(peekUnit(tokenizer, u8)).resolves.toBe(0x7f);
  await expect(readUnit(tokenizer, u8)).resolves.toBe(0x7f);

  await expect(peekUnit(tokenizer, u8)).resolves.toBe(0x80);
});
