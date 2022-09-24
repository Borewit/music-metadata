import { test, expect } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import { f16be, f16le, f32be, f32le, f64be, f64le } from "../float";

test("unit: float point 16bit big endian", async () => {
  const buffer = new Uint8Array([
    0b0011_1101, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b1000_0000, 0b0000_0000, 0b0111_1100, 0b0000_0000, 0b1111_1100,
    0b0000_0000, 0b0111_1101, 0b0000_0000,
  ]);
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, f16be)).resolves.toBe(+1.25);
  await expect(readUnitFromTokenizer(tokenizer, f16be)).resolves.toBe(+0);
  await expect(readUnitFromTokenizer(tokenizer, f16be)).resolves.toBe(-0);
  await expect(readUnitFromTokenizer(tokenizer, f16be)).resolves.toBe(Number.POSITIVE_INFINITY);
  await expect(readUnitFromTokenizer(tokenizer, f16be)).resolves.toBe(Number.NEGATIVE_INFINITY);
  await expect(readUnitFromTokenizer(tokenizer, f16be)).resolves.toBe(Number.NaN);
});

test("unit: float point 16bit little endian", async () => {
  const buffer = new Uint8Array([
    0b0000_0000, 0b0011_1101, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b1000_0000, 0b0000_0000, 0b0111_1100, 0b0000_0000,
    0b1111_1100, 0b0000_0000, 0b0111_1101,
  ]);
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, f16le)).resolves.toBe(+1.25);
  await expect(readUnitFromTokenizer(tokenizer, f16le)).resolves.toBe(+0);
  await expect(readUnitFromTokenizer(tokenizer, f16le)).resolves.toBe(-0);
  await expect(readUnitFromTokenizer(tokenizer, f16le)).resolves.toBe(Number.POSITIVE_INFINITY);
  await expect(readUnitFromTokenizer(tokenizer, f16le)).resolves.toBe(Number.NEGATIVE_INFINITY);
  await expect(readUnitFromTokenizer(tokenizer, f16le)).resolves.toBe(Number.NaN);
});

test("unit: float point 32bit big endian", async () => {
  const buffer = new Uint8Array([
    0b0011_1111, 0b1010_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b1000_0000,
    0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0111_1111, 0b1000_0000, 0b0000_0000, 0b0000_0000, 0b1111_1111, 0b1000_0000,
    0b0000_0000, 0b0000_0000, 0b0111_1111, 0b1010_0000, 0b0000_0000, 0b0000_0000,
  ]);
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, f32be)).resolves.toBe(+1.25);
  await expect(readUnitFromTokenizer(tokenizer, f32be)).resolves.toBe(+0);
  await expect(readUnitFromTokenizer(tokenizer, f32be)).resolves.toBe(-0);
  await expect(readUnitFromTokenizer(tokenizer, f32be)).resolves.toBe(Number.POSITIVE_INFINITY);
  await expect(readUnitFromTokenizer(tokenizer, f32be)).resolves.toBe(Number.NEGATIVE_INFINITY);
  await expect(readUnitFromTokenizer(tokenizer, f32be)).resolves.toBe(Number.NaN);
});

test("unit: float point 32bit little endian", async () => {
  const buffer = new Uint8Array([
    0b0000_0000, 0b0000_0000, 0b1010_0000, 0b0011_1111, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000,
    0b0000_0000, 0b0000_0000, 0b1000_0000, 0b0000_0000, 0b0000_0000, 0b1000_0000, 0b0111_1111, 0b0000_0000, 0b0000_0000,
    0b1000_0000, 0b1111_1111, 0b0000_0000, 0b0000_0000, 0b1010_0000, 0b0111_1111,
  ]);
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, f32le)).resolves.toBe(+1.25);
  await expect(readUnitFromTokenizer(tokenizer, f32le)).resolves.toBe(+0);
  await expect(readUnitFromTokenizer(tokenizer, f32le)).resolves.toBe(-0);
  await expect(readUnitFromTokenizer(tokenizer, f32le)).resolves.toBe(Number.POSITIVE_INFINITY);
  await expect(readUnitFromTokenizer(tokenizer, f32le)).resolves.toBe(Number.NEGATIVE_INFINITY);
  await expect(readUnitFromTokenizer(tokenizer, f32le)).resolves.toBe(Number.NaN);
});

test("unit: float point 64bit big endian", async () => {
  const buffer = new Uint8Array([
    0b0011_1111, 0b1111_0100, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000,
    0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b1000_0000, 0b0000_0000,
    0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0111_1111, 0b1111_0000, 0b0000_0000,
    0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b1111_1111, 0b1111_0000, 0b0000_0000, 0b0000_0000,
    0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0111_1111, 0b1111_0100, 0b0000_0000, 0b0000_0000, 0b0000_0000,
    0b0000_0000, 0b0000_0000, 0b0000_0000,
  ]);
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, f64be)).resolves.toBe(+1.25);
  await expect(readUnitFromTokenizer(tokenizer, f64be)).resolves.toBe(+0);
  await expect(readUnitFromTokenizer(tokenizer, f64be)).resolves.toBe(-0);
  await expect(readUnitFromTokenizer(tokenizer, f64be)).resolves.toBe(Number.POSITIVE_INFINITY);
  await expect(readUnitFromTokenizer(tokenizer, f64be)).resolves.toBe(Number.NEGATIVE_INFINITY);
  await expect(readUnitFromTokenizer(tokenizer, f64be)).resolves.toBe(Number.NaN);
});

test("unit: float point 64bit little endian", async () => {
  const buffer = new Uint8Array([
    0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b1111_0100, 0b0011_1111, 0b0000_0000,
    0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000,
    0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b1000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000,
    0b0000_0000, 0b0000_0000, 0b0000_0000, 0b1111_0000, 0b0111_1111, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000,
    0b0000_0000, 0b0000_0000, 0b1111_0000, 0b1111_1111, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000,
    0b0000_0000, 0b1111_0100, 0b0111_1111,
  ]);
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, f64le)).resolves.toBe(+1.25);
  await expect(readUnitFromTokenizer(tokenizer, f64le)).resolves.toBe(+0);
  await expect(readUnitFromTokenizer(tokenizer, f64le)).resolves.toBe(-0);
  await expect(readUnitFromTokenizer(tokenizer, f64le)).resolves.toBe(Number.POSITIVE_INFINITY);
  await expect(readUnitFromTokenizer(tokenizer, f64le)).resolves.toBe(Number.NEGATIVE_INFINITY);
  await expect(readUnitFromTokenizer(tokenizer, f64le)).resolves.toBe(Number.NaN);
});
