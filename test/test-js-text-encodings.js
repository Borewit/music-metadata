var common = require('../lib/common');
var test   = require('prova');

test('should be able to parse UTF-16BE string with BOM', function (t) {
  var expected = '2007';
  var sample = new Buffer([0xFE, 0xFF, 0x00, 0x32, 0x00, 0x30, 0x00, 0x30, 0x00, 0x37]);
  var output = common.readUTF16String(sample);
  t.strictEqual(output, expected);
  t.end();
});

test('should be able to parse UTF-16LE string with BOM', function (t) {
  var expected = '2007';
  var sample = new Buffer([0xFF, 0xFE, 0x32, 0x00, 0x30, 0x00, 0x30, 0x00, 0x37, 0x00]);
  var output = common.readUTF16String(sample);
  t.strictEqual(output, expected);
  t.end();
});

test('should be able to parse UTF-16LE string without BOM', function (t) {
  var expected = '2007';
  var sample = new Buffer([0x32, 0x00, 0x30, 0x00, 0x30, 0x00, 0x37, 0x00]);
  var output = common.readUTF16String(sample);
  t.strictEqual(output, expected);
  t.end();
});
