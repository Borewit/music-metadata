var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test('should be able to read id3v2 files with extended headers', function (t) {
  t.plan(4)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/id3v2-xheader.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/id3v2-xheader.mp3'))

  mm(sample, function (err, result) {
    t.error(err)

    t.strictEqual(result.format.duration, 0, 'format.duration')

    var expected = {
      title: 'title',
      artist: [],
      albumartist: [],
      album: '',
      year: '',
      track: { no: 0, of: 0 },
      genre: [],
      disk: { no: 0, of: 0 },
      picture: {}
    }
    // additional check because deepEqual is not strict
    t.strictEqual(result.common.year, expected.year, 'common.year')
    t.deepEqual(result.common, expected, 'common.metadata')
    t.end()
  })
})
