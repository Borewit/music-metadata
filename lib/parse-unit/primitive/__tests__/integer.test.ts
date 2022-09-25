import { test, expect } from "vitest";

import { BufferTokenizer } from "../../../strtok3/BufferTokenizer";
import { readUnitFromTokenizer } from "../../utility/read-unit";
import {
  u8,
  u16be,
  u16le,
  u24be,
  u24le,
  u32be,
  u32le,
  u64be,
  u64le,
  i8,
  i16be,
  i16le,
  i24be,
  i24le,
  i32be,
  i32le,
  i64be,
  i64le,
} from "../integer";

const buffer = new Uint8Array([
  0x00, 0x01, 0x7f, 0x80, 0xff, 0x81, 0xe6, 0x47, 0x80, 0x6a, 0x5e, 0x4b, 0x2e, 0x63, 0x5a, 0x6d, 0xdd, 0x1d, 0xee,
  0x4e, 0xcd, 0x5f, 0x98, 0xb8,
]);

test("unit: unsigned integer 8bit", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, u8)).resolves.toBe(0x00);
  await expect(readUnitFromTokenizer(tokenizer, u8)).resolves.toBe(0x01);
  await expect(readUnitFromTokenizer(tokenizer, u8)).resolves.toBe(0x7f);
  await expect(readUnitFromTokenizer(tokenizer, u8)).resolves.toBe(0x80);
  await expect(readUnitFromTokenizer(tokenizer, u8)).resolves.toBe(0xff);
  await expect(readUnitFromTokenizer(tokenizer, u8)).resolves.toBe(0x81);
});

test("unit: unsigned integer 16bit big endian", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, u16be)).resolves.toBe(0x00_01);
  await expect(readUnitFromTokenizer(tokenizer, u16be)).resolves.toBe(0x7f_80);
  await expect(readUnitFromTokenizer(tokenizer, u16be)).resolves.toBe(0xff_81);
  await expect(readUnitFromTokenizer(tokenizer, u16be)).resolves.toBe(0xe6_47);
  await expect(readUnitFromTokenizer(tokenizer, u16be)).resolves.toBe(0x80_6a);
  await expect(readUnitFromTokenizer(tokenizer, u16be)).resolves.toBe(0x5e_4b);
});

test("unit: unsigned integer 16bit little endian", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, u16le)).resolves.toBe(0x01_00);
  await expect(readUnitFromTokenizer(tokenizer, u16le)).resolves.toBe(0x80_7f);
  await expect(readUnitFromTokenizer(tokenizer, u16le)).resolves.toBe(0x81_ff);
  await expect(readUnitFromTokenizer(tokenizer, u16le)).resolves.toBe(0x47_e6);
  await expect(readUnitFromTokenizer(tokenizer, u16le)).resolves.toBe(0x6a_80);
  await expect(readUnitFromTokenizer(tokenizer, u16le)).resolves.toBe(0x4b_5e);
});

test("unit: unsigned integer 24bit big endian", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, u24be)).resolves.toBe(0x00_01_7f);
  await expect(readUnitFromTokenizer(tokenizer, u24be)).resolves.toBe(0x80_ff_81);
  await expect(readUnitFromTokenizer(tokenizer, u24be)).resolves.toBe(0xe6_47_80);
  await expect(readUnitFromTokenizer(tokenizer, u24be)).resolves.toBe(0x6a_5e_4b);
  await expect(readUnitFromTokenizer(tokenizer, u24be)).resolves.toBe(0x2e_63_5a);
  await expect(readUnitFromTokenizer(tokenizer, u24be)).resolves.toBe(0x6d_dd_1d);
});

test("unit: unsigned integer 24bit little endian", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, u24le)).resolves.toBe(0x7f_01_00);
  await expect(readUnitFromTokenizer(tokenizer, u24le)).resolves.toBe(0x81_ff_80);
  await expect(readUnitFromTokenizer(tokenizer, u24le)).resolves.toBe(0x80_47_e6);
  await expect(readUnitFromTokenizer(tokenizer, u24le)).resolves.toBe(0x4b_5e_6a);
  await expect(readUnitFromTokenizer(tokenizer, u24le)).resolves.toBe(0x5a_63_2e);
  await expect(readUnitFromTokenizer(tokenizer, u24le)).resolves.toBe(0x1d_dd_6d);
});

test("unit: unsigned integer 32bit big endian", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, u32be)).resolves.toBe(0x00_01_7f_80);
  await expect(readUnitFromTokenizer(tokenizer, u32be)).resolves.toBe(0xff_81_e6_47);
  await expect(readUnitFromTokenizer(tokenizer, u32be)).resolves.toBe(0x80_6a_5e_4b);
  await expect(readUnitFromTokenizer(tokenizer, u32be)).resolves.toBe(0x2e_63_5a_6d);
  await expect(readUnitFromTokenizer(tokenizer, u32be)).resolves.toBe(0xdd_1d_ee_4e);
  await expect(readUnitFromTokenizer(tokenizer, u32be)).resolves.toBe(0xcd_5f_98_b8);
});

test("unit: unsigned integer 32bit little endian", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, u32le)).resolves.toBe(0x80_7f_01_00);
  await expect(readUnitFromTokenizer(tokenizer, u32le)).resolves.toBe(0x47_e6_81_ff);
  await expect(readUnitFromTokenizer(tokenizer, u32le)).resolves.toBe(0x4b_5e_6a_80);
  await expect(readUnitFromTokenizer(tokenizer, u32le)).resolves.toBe(0x6d_5a_63_2e);
  await expect(readUnitFromTokenizer(tokenizer, u32le)).resolves.toBe(0x4e_ee_1d_dd);
  await expect(readUnitFromTokenizer(tokenizer, u32le)).resolves.toBe(0xb8_98_5f_cd);
});

test("unit: unsigned big integer 64bit big endian", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, u64be)).resolves.toBe(0x00_01_7f_80_ff_81_e6_47n);
  await expect(readUnitFromTokenizer(tokenizer, u64be)).resolves.toBe(0x80_6a_5e_4b_2e_63_5a_6dn);
  await expect(readUnitFromTokenizer(tokenizer, u64be)).resolves.toBe(0xdd_1d_ee_4e_cd_5f_98_b8n);
});

test("unit: unsigned big integer 64bit little endian", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, u64le)).resolves.toBe(0x47_e6_81_ff_80_7f_01_00n);
  await expect(readUnitFromTokenizer(tokenizer, u64le)).resolves.toBe(0x6d_5a_63_2e_4b_5e_6a_80n);
  await expect(readUnitFromTokenizer(tokenizer, u64le)).resolves.toBe(0xb8_98_5f_cd_4e_ee_1d_ddn);
});

test("unit: signed integer 8bit", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, i8)).resolves.toBe(0x00);
  await expect(readUnitFromTokenizer(tokenizer, i8)).resolves.toBe(0x01);
  await expect(readUnitFromTokenizer(tokenizer, i8)).resolves.toBe(0x7f);
  await expect(readUnitFromTokenizer(tokenizer, i8)).resolves.toBe(0x80 - 0x1_00);
  await expect(readUnitFromTokenizer(tokenizer, i8)).resolves.toBe(0xff - 0x1_00);
  await expect(readUnitFromTokenizer(tokenizer, i8)).resolves.toBe(0x81 - 0x1_00);
});

test("unit: signed integer 16bit big endian", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, i16be)).resolves.toBe(0x00_01);
  await expect(readUnitFromTokenizer(tokenizer, i16be)).resolves.toBe(0x7f_80);
  await expect(readUnitFromTokenizer(tokenizer, i16be)).resolves.toBe(0xff_81 - 0x1_00_00);
  await expect(readUnitFromTokenizer(tokenizer, i16be)).resolves.toBe(0xe6_47 - 0x1_00_00);
  await expect(readUnitFromTokenizer(tokenizer, i16be)).resolves.toBe(0x80_6a - 0x1_00_00);
  await expect(readUnitFromTokenizer(tokenizer, i16be)).resolves.toBe(0x5e_4b);
});

test("unit: signed integer 16bit little endian", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, i16le)).resolves.toBe(0x01_00);
  await expect(readUnitFromTokenizer(tokenizer, i16le)).resolves.toBe(0x80_7f - 0x1_00_00);
  await expect(readUnitFromTokenizer(tokenizer, i16le)).resolves.toBe(0x81_ff - 0x1_00_00);
  await expect(readUnitFromTokenizer(tokenizer, i16le)).resolves.toBe(0x47_e6);
  await expect(readUnitFromTokenizer(tokenizer, i16le)).resolves.toBe(0x6a_80);
  await expect(readUnitFromTokenizer(tokenizer, i16le)).resolves.toBe(0x4b_5e);
});

test("unit: signed integer 24bit big endian", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, i24be)).resolves.toBe(0x00_01_7f);
  await expect(readUnitFromTokenizer(tokenizer, i24be)).resolves.toBe(0x80_ff_81 - 0x1_00_00_00);
  await expect(readUnitFromTokenizer(tokenizer, i24be)).resolves.toBe(0xe6_47_80 - 0x1_00_00_00);
  await expect(readUnitFromTokenizer(tokenizer, i24be)).resolves.toBe(0x6a_5e_4b);
  await expect(readUnitFromTokenizer(tokenizer, i24be)).resolves.toBe(0x2e_63_5a);
  await expect(readUnitFromTokenizer(tokenizer, i24be)).resolves.toBe(0x6d_dd_1d);
});

test("unit: signed integer 24bit little endian", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, i24le)).resolves.toBe(0x7f_01_00);
  await expect(readUnitFromTokenizer(tokenizer, i24le)).resolves.toBe(0x81_ff_80 - 0x1_00_00_00);
  await expect(readUnitFromTokenizer(tokenizer, i24le)).resolves.toBe(0x80_47_e6 - 0x1_00_00_00);
  await expect(readUnitFromTokenizer(tokenizer, i24le)).resolves.toBe(0x4b_5e_6a);
  await expect(readUnitFromTokenizer(tokenizer, i24le)).resolves.toBe(0x5a_63_2e);
  await expect(readUnitFromTokenizer(tokenizer, i24le)).resolves.toBe(0x1d_dd_6d);
});

test("unit: signed integer 32bit big endian", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, i32be)).resolves.toBe(0x00_01_7f_80);
  await expect(readUnitFromTokenizer(tokenizer, i32be)).resolves.toBe(0xff_81_e6_47 - 0x1_00_00_00_00);
  await expect(readUnitFromTokenizer(tokenizer, i32be)).resolves.toBe(0x80_6a_5e_4b - 0x1_00_00_00_00);
  await expect(readUnitFromTokenizer(tokenizer, i32be)).resolves.toBe(0x2e_63_5a_6d);
  await expect(readUnitFromTokenizer(tokenizer, i32be)).resolves.toBe(0xdd_1d_ee_4e - 0x1_00_00_00_00);
  await expect(readUnitFromTokenizer(tokenizer, i32be)).resolves.toBe(0xcd_5f_98_b8 - 0x1_00_00_00_00);
});

test("unit: signed integer 32bit little endian", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, i32le)).resolves.toBe(0x80_7f_01_00 - 0x1_00_00_00_00);
  await expect(readUnitFromTokenizer(tokenizer, i32le)).resolves.toBe(0x47_e6_81_ff);
  await expect(readUnitFromTokenizer(tokenizer, i32le)).resolves.toBe(0x4b_5e_6a_80);
  await expect(readUnitFromTokenizer(tokenizer, i32le)).resolves.toBe(0x6d_5a_63_2e);
  await expect(readUnitFromTokenizer(tokenizer, i32le)).resolves.toBe(0x4e_ee_1d_dd);
  await expect(readUnitFromTokenizer(tokenizer, i32le)).resolves.toBe(0xb8_98_5f_cd - 0x1_00_00_00_00);
});

test("unit: signed big integer 64bit big endian", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, i64be)).resolves.toBe(0x00_01_7f_80_ff_81_e6_47n);
  await expect(readUnitFromTokenizer(tokenizer, i64be)).resolves.toBe(
    0x80_6a_5e_4b_2e_63_5a_6dn - 0x1_00_00_00_00_00_00_00_00n
  );
  await expect(readUnitFromTokenizer(tokenizer, i64be)).resolves.toBe(
    0xdd_1d_ee_4e_cd_5f_98_b8n - 0x1_00_00_00_00_00_00_00_00n
  );
});

test("unit: signed big integer 64bit little endian", async () => {
  const tokenizer = new BufferTokenizer(buffer);

  await expect(readUnitFromTokenizer(tokenizer, i64le)).resolves.toBe(0x47_e6_81_ff_80_7f_01_00n);
  await expect(readUnitFromTokenizer(tokenizer, i64le)).resolves.toBe(0x6d_5a_63_2e_4b_5e_6a_80n);
  await expect(readUnitFromTokenizer(tokenizer, i64le)).resolves.toBe(
    0xb8_98_5f_cd_4e_ee_1d_ddn - 0x1_00_00_00_00_00_00_00_00n
  );
});
