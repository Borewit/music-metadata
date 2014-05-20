var common = require('../lib/common');
var test   = require('prova');

test('should be able to detect ftypmp42 as a valid mp4 header type', function (t) {
  var buf = new Buffer([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32])

  var types = [
    {
      buf: new Buffer([0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32]),
      tag: require('../lib/id4'),
      offset: 4,
    }
  ]

  t.equal(common.getParserForMediaType(types, buf), require('../lib/id4'), 'type');
  t.end();
});
