import { read, write } from "../../lib/ieee754";
import { test, expect } from "vitest";

const EPSILON = 0.000_01;

test("read float", function () {
  const val = 42.42;
  const buf = Buffer.alloc(4);

  buf.writeFloatLE(val, 0);
  const num = read(buf, 0, true, 23, 4);

  expect(Math.abs(num - val)).toBeLessThan(EPSILON);
});

test("write float", function () {
  const val = 42.42;
  const buf = Buffer.alloc(4);

  write(buf, val, 0, true, 23, 4);
  const num = buf.readFloatLE(0);

  expect(Math.abs(num - val)).toBeLessThan(EPSILON);
});

test("read double", function () {
  const value = 12_345.123_456_789;
  const buf = Buffer.alloc(8);

  buf.writeDoubleLE(value, 0);
  const num = read(buf, 0, true, 52, 8);

  expect(Math.abs(num - value)).toBeLessThan(EPSILON);
});

test("write double", function () {
  const value = 12_345.123_456_789;
  const buf = Buffer.alloc(8);

  write(buf, value, 0, true, 52, 8);
  const num = buf.readDoubleLE(0);

  expect(Math.abs(num - value)).toBeLessThan(EPSILON);
});
