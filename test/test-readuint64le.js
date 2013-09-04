var readUInt64LE = require('../lib/common').readUInt64LE;
var test = require('tap').test;

test('readUInt64LE', function (t) {
  var tests = [
    {
      buf: new Buffer([0, 0, 0, 0, 0, 0, 0, 0]),
      offset: 0,
      expected: 0,
    },
    {
      buf: new Buffer([1, 244, 0, 0, 0, 0, 0, 0, 0]),
      offset: 1,
      expected: 244,
    },
    {
      buf: new Buffer([244, 1, 2, 3, 0, 0, 0, 0]),
      offset: 0,
      expected: 50463220,
    },
    {
      buf: new Buffer([8, 7, 6, 5, 4, 3, 2, 1]),
      offset: 0,
      expected: 72623859790382856,
    },
  ];
  t.plan(tests.length);
  tests.forEach(function(test) {
    t.strictEqual(readUInt64LE(test.buf, test.offset), test.expected);
  });
  t.end();
});
