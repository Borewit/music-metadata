var stripNulls = require('../lib/common').stripNulls;
var test = require('tap').test;

test('readUInt64LE', function (t) {
  var tests = [
    {
      str: "foo",
      expected: "foo",
    },
    {
      str: "derp\x00\x00",
      expected: "derp",
    },
    {
      str: "\x00\x00harkaaa\x00",
      expected: "harkaaa",
    },
    {
      str: "\x00joystick",
      expected: "joystick",
    },
  ];
  t.plan(tests.length);
  tests.forEach(function(test) {
    t.strictEqual(stripNulls(test.str), test.expected);
  });
  t.end();
});
