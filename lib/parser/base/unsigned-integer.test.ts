import { test, expect } from "vitest";
import {
  readUint16be,
  readUint16le,
  readUint24be,
  readUint24le,
  readUint32be,
  readUint32le,
  readUint64be,
  readUint64le,
  readUint8,
  UINT16_SIZE,
  UINT24_SIZE,
  UINT32_SIZE,
  UINT64_SIZE,
  UINT8_SIZE,
} from "./unsigned-integer";

test("decode unsigned 8 bit integer", () => {
  const buffer = new Uint8Array([0x00, 0x01, 0x7f, 0x80, 0xff, 0x81]);

  expect(readUint8(buffer, UINT8_SIZE * 0)).toBe(0x00);
  expect(readUint8(buffer, UINT8_SIZE * 1)).toBe(0x01);
  expect(readUint8(buffer, UINT8_SIZE * 2)).toBe(0x7f);
  expect(readUint8(buffer, UINT8_SIZE * 3)).toBe(0x80);
  expect(readUint8(buffer, UINT8_SIZE * 4)).toBe(0xff);
  expect(readUint8(buffer, UINT8_SIZE * 5)).toBe(0x81);
  expect(readUint8(buffer, UINT8_SIZE * 6)).toBeInstanceOf(RangeError);
});

test("decode unsigned 16 bit big endian integer", () => {
  const buffer = new Uint8Array([0x0a, 0x1a, 0x00, 0x00, 0xff, 0xff, 0x80, 0x00]);

  expect(readUint16be(buffer, UINT16_SIZE * 0)).toBe(0x0a_1a);
  expect(readUint16be(buffer, UINT16_SIZE * 1)).toBe(0x00_00);
  expect(readUint16be(buffer, UINT16_SIZE * 2)).toBe(0xff_ff);
  expect(readUint16be(buffer, UINT16_SIZE * 3)).toBe(0x80_00);
  expect(readUint16be(buffer, UINT16_SIZE * 4)).toBeInstanceOf(RangeError);
});

test("decode unsigned 16 bit little endian integer", () => {
  const buffer = new Uint8Array([0x1a, 0x0a, 0x00, 0x00, 0xff, 0xff, 0x00, 0x80]);

  expect(readUint16le(buffer, UINT16_SIZE * 0)).toBe(0x0a_1a);
  expect(readUint16le(buffer, UINT16_SIZE * 1)).toBe(0x00_00);
  expect(readUint16le(buffer, UINT16_SIZE * 2)).toBe(0xff_ff);
  expect(readUint16le(buffer, UINT16_SIZE * 3)).toBe(0x80_00);
  expect(readUint16le(buffer, UINT16_SIZE * 4)).toBeInstanceOf(RangeError);
});

test("decode unsigned 24 bit big endian integer", () => {
  const buffer = new Uint8Array([0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x10, 0x00, 0xff, 0x80, 0x00, 0x00]);

  expect(readUint24be(buffer, UINT24_SIZE * 0)).toBe(0x00_00_00);
  expect(readUint24be(buffer, UINT24_SIZE * 1)).toBe(0xff_ff_ff);
  expect(readUint24be(buffer, UINT24_SIZE * 2)).toBe(0x10_00_ff);
  expect(readUint24be(buffer, UINT24_SIZE * 3)).toBe(0x80_00_00);
  expect(readUint24be(buffer, UINT24_SIZE * 4)).toBeInstanceOf(RangeError);
});

test("decode unsigned 24 bit little endian integer", () => {
  const buffer = new Uint8Array([0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0x00, 0x10, 0x00, 0x00, 0x80]);

  expect(readUint24le(buffer, UINT24_SIZE * 0)).toBe(0x00_00_00);
  expect(readUint24le(buffer, UINT24_SIZE * 1)).toBe(0xff_ff_ff);
  expect(readUint24le(buffer, UINT24_SIZE * 2)).toBe(0x10_00_ff);
  expect(readUint24le(buffer, UINT24_SIZE * 3)).toBe(0x80_00_00);
  expect(readUint24le(buffer, UINT24_SIZE * 4)).toBeInstanceOf(RangeError);
});

test("decode unsigned 32 bit big endian integer", () => {
  const buffer = new Uint8Array([
    0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0x00, 0x10, 0x00, 0xff, 0x80, 0x00, 0x00, 0x00,
  ]);

  expect(readUint32be(buffer, UINT32_SIZE * 0)).toBe(0x00_00_00_00);
  expect(readUint32be(buffer, UINT32_SIZE * 1)).toBe(0xff_ff_ff_ff);
  expect(readUint32be(buffer, UINT32_SIZE * 2)).toBe(0x00_10_00_ff);
  expect(readUint32be(buffer, UINT32_SIZE * 3)).toBe(0x80_00_00_00);
  expect(readUint32be(buffer, UINT32_SIZE * 4)).toBeInstanceOf(RangeError);
});

test("decode unsigned 32 bit little endian integer", () => {
  const buffer = new Uint8Array([
    0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x10, 0x00, 0x00, 0x00, 0x00, 0x80,
  ]);

  expect(readUint32le(buffer, UINT32_SIZE * 0)).toBe(0x00_00_00_00);
  expect(readUint32le(buffer, UINT32_SIZE * 1)).toBe(0xff_ff_ff_ff);
  expect(readUint32le(buffer, UINT32_SIZE * 2)).toBe(0x00_10_00_ff);
  expect(readUint32le(buffer, UINT32_SIZE * 3)).toBe(0x80_00_00_00);
  expect(readUint32le(buffer, UINT32_SIZE * 4)).toBeInstanceOf(RangeError);
});

test("decode unsigned 64 bit big endian integer", () => {
  const buffer = new Uint8Array([
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0xff,
    0xbb, 0xee, 0xdd, 0xcc, 0xaa, 0x00, 0x00, 0xff, 0xbb, 0xee, 0xdd, 0xcc, 0xbb,
  ]);

  expect(readUint64be(buffer, UINT64_SIZE * 0)).toBe(0x00_00_00_00_00_00_00_00n);
  expect(readUint64be(buffer, UINT64_SIZE * 1)).toBe(0xff_ff_ff_ff_ff_ff_ff_ffn);
  expect(readUint64be(buffer, UINT64_SIZE * 2)).toBe(0x00_00_ff_bb_ee_dd_cc_aan);
  expect(readUint64be(buffer, UINT64_SIZE * 3)).toBe(0x00_00_ff_bb_ee_dd_cc_bbn);
  expect(readUint64be(buffer, UINT64_SIZE * 4)).toBeInstanceOf(RangeError);
});

test("decode unsigned 64 bit little endian integer", () => {
  const buffer = new Uint8Array([
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xaa, 0xcc, 0xdd,
    0xee, 0xbb, 0xff, 0x00, 0x00, 0xbb, 0xcc, 0xdd, 0xee, 0xbb, 0xff, 0x00, 0x00,
  ]);

  expect(readUint64le(buffer, UINT64_SIZE * 0)).toBe(0x00_00_00_00_00_00_00_00n);
  expect(readUint64le(buffer, UINT64_SIZE * 1)).toBe(0xff_ff_ff_ff_ff_ff_ff_ffn);
  expect(readUint64le(buffer, UINT64_SIZE * 2)).toBe(0x00_00_ff_bb_ee_dd_cc_aan);
  expect(readUint64le(buffer, UINT64_SIZE * 3)).toBe(0x00_00_ff_bb_ee_dd_cc_bbn);
  expect(readUint64le(buffer, UINT64_SIZE * 4)).toBeInstanceOf(RangeError);
});
