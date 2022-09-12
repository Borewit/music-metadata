import { test, expect } from "vitest";
import {
  readFloat16be,
  readFloat16le,
  readFloat32be,
  readFloat32le,
  readFloat64be,
  readFloat64le,
  FLOAT16_SIZE,
  FLOAT32_SIZE,
  FLOAT64_SIZE,
} from "./float";

test("decode 16 bit big endian floating point number", () => {
  const buffer = new Uint8Array([
    0b0101_0101, 0b0101_0010, 0b1101_0101, 0b0101_0010, 0b0011_1100, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b1111_1100,
    0b0000_0000,
  ]);

  expect(readFloat16be(buffer, FLOAT16_SIZE * 0)).toEqual([true, 85.125]);
  expect(readFloat16be(buffer, FLOAT16_SIZE * 1)).toEqual([true, -85.125]);
  expect(readFloat16be(buffer, FLOAT16_SIZE * 2)).toEqual([true, 1]);
  expect(readFloat16be(buffer, FLOAT16_SIZE * 3)).toEqual([true, 0]);
  expect(readFloat16be(buffer, FLOAT16_SIZE * 4)).toEqual([true, Number.NEGATIVE_INFINITY]);
  expect(readFloat16be(buffer, FLOAT16_SIZE * 5)[0]).toEqual(false);
});

test("decode 16 bit little endian floating point number", () => {
  const buffer = new Uint8Array([
    0b0101_0010, 0b0101_0101, 0b0101_0010, 0b1101_0101, 0b0000_0000, 0b0011_1100, 0b0000_0000, 0b1000_0000, 0b0000_0000,
    0b0111_1100,
  ]);

  expect(readFloat16le(buffer, FLOAT16_SIZE * 0)).toEqual([true, 85.125]);
  expect(readFloat16le(buffer, FLOAT16_SIZE * 1)).toEqual([true, -85.125]);
  expect(readFloat16le(buffer, FLOAT16_SIZE * 2)).toEqual([true, 1]);
  expect(readFloat16le(buffer, FLOAT16_SIZE * 3)).toEqual([true, -0]);
  expect(readFloat16le(buffer, FLOAT16_SIZE * 4)).toEqual([true, Number.POSITIVE_INFINITY]);
  expect(readFloat16le(buffer, FLOAT16_SIZE * 5)[0]).toEqual(false);
});

test("decode 32 bit big endian floating point number", () => {
  const buffer = Buffer.from([
    0b0100_0010, 0b1010_1010, 0b0100_0000, 0b0000_0000, 0b1100_0010, 0b1010_1010, 0b0100_0000, 0b0000_0000, 0b0011_1111,
    0b1000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b1111_1111, 0b1000_0000,
    0b0000_0000, 0b0000_0000,
  ]);

  expect(readFloat32be(buffer, FLOAT32_SIZE * 0)).toEqual([true, 85.125]);
  expect(readFloat32be(buffer, FLOAT32_SIZE * 1)).toEqual([true, -85.125]);
  expect(readFloat32be(buffer, FLOAT32_SIZE * 2)).toEqual([true, 1]);
  expect(readFloat32be(buffer, FLOAT32_SIZE * 3)).toEqual([true, 0]);
  expect(readFloat32be(buffer, FLOAT32_SIZE * 4)).toEqual([true, Number.NEGATIVE_INFINITY]);
  expect(readFloat32be(buffer, FLOAT32_SIZE * 5)[0]).toEqual(false);
});

test("decode 32 bit little endian floating point number", () => {
  const buffer = Buffer.from([
    0b0000_0000, 0b0100_0000, 0b1010_1010, 0b0100_0010, 0b0000_0000, 0b0100_0000, 0b1010_1010, 0b1100_0010, 0b0000_0000,
    0b0000_0000, 0b1000_0000, 0b0011_1111, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b1000_0000, 0b0000_0000, 0b0000_0000,
    0b1000_0000, 0b0111_1111,
  ]);

  expect(readFloat32le(buffer, FLOAT32_SIZE * 0)).toEqual([true, 85.125]);
  expect(readFloat32le(buffer, FLOAT32_SIZE * 1)).toEqual([true, -85.125]);
  expect(readFloat32le(buffer, FLOAT32_SIZE * 2)).toEqual([true, 1]);
  expect(readFloat32le(buffer, FLOAT32_SIZE * 3)).toEqual([true, -0]);
  expect(readFloat32le(buffer, FLOAT32_SIZE * 4)).toEqual([true, Number.POSITIVE_INFINITY]);
  expect(readFloat32le(buffer, FLOAT32_SIZE * 5)[0]).toEqual(false);
});

test("decode 64 bit big endian floating point number", () => {
  const buffer = Buffer.from([
    0b0100_0000, 0b0101_0101, 0b0100_1000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b1100_0000,
    0b0101_0101, 0b0100_1000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0011_1111, 0b1111_0000,
    0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b1000_0000, 0b0000_0000, 0b0000_0000,
    0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0111_1111, 0b1111_0000, 0b0000_0000, 0b0000_0000,
    0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000,
  ]);

  expect(readFloat64be(buffer, FLOAT64_SIZE * 0)).toEqual([true, 85.125]);
  expect(readFloat64be(buffer, FLOAT64_SIZE * 1)).toEqual([true, -85.125]);
  expect(readFloat64be(buffer, FLOAT64_SIZE * 2)).toEqual([true, 1]);
  expect(readFloat64be(buffer, FLOAT64_SIZE * 3)).toEqual([true, -0]);
  expect(readFloat64be(buffer, FLOAT64_SIZE * 4)).toEqual([true, Number.POSITIVE_INFINITY]);
  expect(readFloat64be(buffer, FLOAT64_SIZE * 5)[0]).toEqual(false);
});

test("decode 64 bit little endian floating point number", () => {
  const buffer = Buffer.from([
    0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0100_1000, 0b0101_0101, 0b0100_0000, 0b0000_0000,
    0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0100_1000, 0b0101_0101, 0b1100_0000, 0b0000_0000, 0b0000_0000,
    0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b1111_0000, 0b0011_1111, 0b0000_0000, 0b0000_0000, 0b0000_0000,
    0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b1000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000, 0b0000_0000,
    0b0000_0000, 0b0000_0000, 0b1111_0000, 0b0111_1111,
  ]);

  expect(readFloat64le(buffer, FLOAT64_SIZE * 0)).toEqual([true, 85.125]);
  expect(readFloat64le(buffer, FLOAT64_SIZE * 1)).toEqual([true, -85.125]);
  expect(readFloat64le(buffer, FLOAT64_SIZE * 2)).toEqual([true, 1]);
  expect(readFloat64le(buffer, FLOAT64_SIZE * 3)).toEqual([true, -0]);
  expect(readFloat64le(buffer, FLOAT64_SIZE * 4)).toEqual([true, Number.POSITIVE_INFINITY]);
  expect(readFloat64le(buffer, FLOAT64_SIZE * 5)[0]).toEqual(false);
});
