var common = require('../lib/common')
var test = require('tape')

test('should be able to remove unsync bytes from buffer', function (t) {
  var expected = new Buffer([0xFF, 0xD8, 0xFF, 0xE0, 0x00])
  var sample = new Buffer([0xFF, 0xD8, 0xFF, 0x00, 0xE0, 0x00])
  var output = common.removeUnsyncBytes(sample)
  t.deepEqual(output, expected, 'bytes')
  t.end()
})
