var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test('should be able to read id3v2 files with extended headers', function (t) {
  t.plan(5)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/id3v2-xheader.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/id3v2-xheader.mp3'))

  mm.parseStream(sample, function (err, result) {
    t.error(err)

    t.strictEqual(result.format.duration, 0.4969375, 'format.duration')

    t.strictEqual(result.common.title, 'title', 'common.title')
    t.deepEqual(result.common.track, { no: null, of: null }, 'common.track')
    t.deepEqual(result.common.disk, { no: null, of: null }, 'common.disk')
    t.end()
  })
})
