import { test, expect } from "vitest";
import {
  INT16_SIZE,
  INT24_SIZE,
  INT32_SIZE,
  INT64_SIZE,
  INT8_SIZE,
  readInt16be,
  readInt16le,
  readInt24be,
  readInt24le,
  readInt32be,
  readInt32le,
  readInt64be,
  readInt64le,
  readInt8,
} from "./signed-integer";

test("decode signed 8 bit integer", () => {
  const buffer = new Uint8Array([0x00, 0x01, 0x7f, 0x80, 0xff, 0x81]);

  expect(readInt8(buffer, INT8_SIZE * 0)).toEqual([true, 0]);
  expect(readInt8(buffer, INT8_SIZE * 1)).toEqual([true, 1]);
  expect(readInt8(buffer, INT8_SIZE * 2)).toEqual([true, 127]);
  expect(readInt8(buffer, INT8_SIZE * 3)).toEqual([true, -128]);
  expect(readInt8(buffer, INT8_SIZE * 4)).toEqual([true, -1]);
  expect(readInt8(buffer, INT8_SIZE * 5)).toEqual([true, -127]);
  expect(readInt8(buffer, INT8_SIZE * 6)[0]).toBe(false);
});

test("decode signed 16 bit big endian integer", () => {
  const buffer = new Uint8Array([0x0a, 0x1a, 0x00, 0x00, 0xff, 0xff, 0x80, 0x00]);

  expect(readInt16be(buffer, INT16_SIZE * 0)).toEqual([true, 2586]);
  expect(readInt16be(buffer, INT16_SIZE * 1)).toEqual([true, 0]);
  expect(readInt16be(buffer, INT16_SIZE * 2)).toEqual([true, -1]);
  expect(readInt16be(buffer, INT16_SIZE * 3)).toEqual([true, -32_768]);
  expect(readInt16be(buffer, INT16_SIZE * 4)[0]).toBe(false);
});

test("decode signed 16 bit little endian integer", () => {
  const buffer = new Uint8Array([0x1a, 0x0a, 0x00, 0x00, 0xff, 0xff, 0x00, 0x80]);

  expect(readInt16le(buffer, INT16_SIZE * 0)).toEqual([true, 2586]);
  expect(readInt16le(buffer, INT16_SIZE * 1)).toEqual([true, 0]);
  expect(readInt16le(buffer, INT16_SIZE * 2)).toEqual([true, -1]);
  expect(readInt16le(buffer, INT16_SIZE * 3)).toEqual([true, -32_768]);
  expect(readInt16le(buffer, INT16_SIZE * 4)[0]).toBe(false);
});

test("decode signed 24 bit big endian integer", () => {
  const buffer = new Uint8Array([0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x10, 0x00, 0xff, 0x80, 0x00, 0x00]);

  expect(readInt24be(buffer, INT24_SIZE * 0)).toEqual([true, 0]);
  expect(readInt24be(buffer, INT24_SIZE * 1)).toEqual([true, -1]);
  expect(readInt24be(buffer, INT24_SIZE * 2)).toEqual([true, 1_048_831]);
  expect(readInt24be(buffer, INT24_SIZE * 3)).toEqual([true, -8_388_608]);
  expect(readInt24be(buffer, INT24_SIZE * 4)[0]).toBe(false);
});

test("decode signed 24 bit little endian integer", () => {
  const buffer = new Uint8Array([0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0x00, 0x10, 0x00, 0x00, 0x80]);

  expect(readInt24le(buffer, INT24_SIZE * 0)).toEqual([true, 0]);
  expect(readInt24le(buffer, INT24_SIZE * 1)).toEqual([true, -1]);
  expect(readInt24le(buffer, INT24_SIZE * 2)).toEqual([true, 1_048_831]);
  expect(readInt24le(buffer, INT24_SIZE * 3)).toEqual([true, -8_388_608]);
  expect(readInt24le(buffer, INT24_SIZE * 4)[0]).toBe(false);
});

test("decode signed 32 bit big endian integer", () => {
  const buffer = new Uint8Array([
    0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0x00, 0x10, 0x00, 0xff, 0x80, 0x00, 0x00, 0x00,
  ]);

  expect(readInt32be(buffer, INT32_SIZE * 0)).toEqual([true, 0]);
  expect(readInt32be(buffer, INT32_SIZE * 1)).toEqual([true, -1]);
  expect(readInt32be(buffer, INT32_SIZE * 2)).toEqual([true, 1_048_831]);
  expect(readInt32be(buffer, INT32_SIZE * 3)).toEqual([true, -2_147_483_648]);
  expect(readInt32be(buffer, INT32_SIZE * 4)[0]).toBe(false);
});

test("decode signed 32 bit little endian integer", () => {
  const buffer = new Uint8Array([
    0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x10, 0x00, 0x00, 0x00, 0x00, 0x80,
  ]);

  expect(readInt32le(buffer, INT32_SIZE * 0)).toEqual([true, 0]);
  expect(readInt32le(buffer, INT32_SIZE * 1)).toEqual([true, -1]);
  expect(readInt32le(buffer, INT32_SIZE * 2)).toEqual([true, 1_048_831]);
  expect(readInt32le(buffer, INT32_SIZE * 3)).toEqual([true, -2_147_483_648]);
  expect(readInt32le(buffer, INT32_SIZE * 4)[0]).toBe(false);
});

test("decode signed 64 bit big endian integer", () => {
  const buffer = new Uint8Array([
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0xff,
    0xbb, 0xee, 0xdd, 0xcc, 0xaa, 0x00, 0x00, 0xff, 0xbb, 0xee, 0xdd, 0xcc, 0xbb,
  ]);

  expect(readInt64be(buffer, INT64_SIZE * 0)).toEqual([true, 0n]);
  expect(readInt64be(buffer, INT64_SIZE * 1)).toEqual([true, -1n]);
  expect(readInt64be(buffer, INT64_SIZE * 2)).toEqual([true, 0x00_00_ff_bb_ee_dd_cc_aan]);
  expect(readInt64be(buffer, INT64_SIZE * 3)).toEqual([true, 0x00_00_ff_bb_ee_dd_cc_bbn]);
  expect(readInt64be(buffer, INT64_SIZE * 4)[0]).toBe(false);
});

test("decode signed 64 bit little endian integer", () => {
  const buffer = new Uint8Array([
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xaa, 0xcc, 0xdd,
    0xee, 0xbb, 0xff, 0x00, 0x00, 0xbb, 0xcc, 0xdd, 0xee, 0xbb, 0xff, 0x00, 0x00,
  ]);

  expect(readInt64le(buffer, INT64_SIZE * 0)).toEqual([true, 0n]);
  expect(readInt64le(buffer, INT64_SIZE * 1)).toEqual([true, -1n]);
  expect(readInt64le(buffer, INT64_SIZE * 2)).toEqual([true, 0x00_00_ff_bb_ee_dd_cc_aan]);
  expect(readInt64le(buffer, INT64_SIZE * 3)).toEqual([true, 0x00_00_ff_bb_ee_dd_cc_bbn]);
  expect(readInt64le(buffer, INT64_SIZE * 4)[0]).toBe(false);
});
