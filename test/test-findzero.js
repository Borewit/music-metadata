var common = require('../lib/common')
var test = require('tape')

var findZero = common.default.findZero

test('find terminator in ascii encoded string', function (t) {
  var buf = new Buffer([0xFF, 0xFF, 0xFF, 0x00])
  t.equal(findZero(buf, 0, buf.length, 'ascii'), 3)
  t.end()
})

test('find terminator in middle of ascii encoded string', function (t) {
  var buf = new Buffer([0xFF, 0xFF, 0x00, 0xFF, 0xFF])
  t.equal(findZero(buf, 0, buf.length, 'ascii'), 2)
  t.end()
})

test('return offset to end if nothing is found', function (t) {
  var buf = new Buffer([0xFF, 0xFF, 0xFF, 0xFF, 0xFF])
  t.equal(findZero(buf, 0, buf.length, 'ascii'), buf.length)
  t.end()
})

test('find terminator in utf16le encoded string', function (t) {
  var buf = new Buffer([0x68, 0x00, 0x65, 0x00, 0x6C, 0x00, 0x6C, 0x00, 0x6F, 0x00, 0x00, 0x00])
  t.equal(findZero(buf, 0, buf.length, 'utf16'), 10)
  t.end()
})

test('find terminator in utf16be encoded string', function (t) {
  // hell(0x00, 0x00)
  var buf = new Buffer([0x00, 0x68, 0x00, 0x65, 0x00, 0x6C, 0x00, 0x6C, 0x00, 0x00])
  t.equal(findZero(buf, 0, buf.length, 'utf16'), 8)
  t.end()
})
