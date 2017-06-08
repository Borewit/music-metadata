var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test('should be able to read id3v2 files with extended headers', function (t) {
  t.plan(4)

  var filename = 'id3v2-xheader.mp3';
  var filePath = path.join(__dirname, 'samples', filename);

  mm.parseFile(filePath, { duration: true }).then(function (result) {
    t.strictEqual(result.format.duration, 0.4969375, 'format.duration')

    t.strictEqual(result.common.title, 'title', 'common.title')
    t.deepEqual(result.common.track, { no: null, of: null }, 'common.track')
    t.deepEqual(result.common.disk, { no: null, of: null }, 'common.disk')
    t.end()
  }).catch(function (err) {
    t.error(err);
  });
})
