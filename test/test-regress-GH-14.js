var common = require('../lib/common');
var test   = require('tap').test;

test('should be able to detect ftypmp42 as a valid mp4 header type', function (t) {
  var buf = new Buffer(12);
  buf[0]  = '0x00'
  buf[1]  = '0x00'
  buf[2]  = '0x00'
  buf[3]  = '0x18'
  buf[4]  = '0x66' // f
  buf[5]  = '0x74' // t
  buf[6]  = '0x79' // y
  buf[7]  = '0x70' // p
  buf[8]  = '0x6D' // m
  buf[9]  = '0x70' // p
  buf[10] = '0x34' // 4
  buf[11] = '0x32' // 2
  t.equal(common.detectMediaType(buf), 'id4', 'type');
  t.end();
});
