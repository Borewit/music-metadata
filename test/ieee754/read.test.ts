const ieee754 = require('../')
const test = require('tape')

const EPSILON = 0.00001

test('read float', function (t) {
  const val = 42.42
  const buf = Buffer.alloc(4)

  buf.writeFloatLE(val, 0)
  const num = ieee754.read(buf, 0, true, 23, 4)

  t.ok(Math.abs(num - val) < EPSILON)
  t.end()
})

test('write float', function (t) {
  const val = 42.42
  const buf = Buffer.alloc(4)

  ieee754.write(buf, val, 0, true, 23, 4)
  const num = buf.readFloatLE(0)

  t.ok(Math.abs(num - val) < EPSILON)
  t.end()
})

test('read double', function (t) {
  const value = 12345.123456789
  const buf = Buffer.alloc(8)

  buf.writeDoubleLE(value, 0)
  const num = ieee754.read(buf, 0, true, 52, 8)

  t.ok(Math.abs(num - value) < EPSILON)
  t.end()
})

test('write double', function (t) {
  const value = 12345.123456789
  const buf = Buffer.alloc(8)

  ieee754.write(buf, value, 0, true, 52, 8)
  const num = buf.readDoubleLE(0)

  t.ok(Math.abs(num - value) < EPSILON)
  t.end()
})