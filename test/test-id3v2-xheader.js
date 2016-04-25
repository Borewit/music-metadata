var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test('should be able to read id3v2 files with extended headers', function (t) {
  t.plan(3)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/id3v2-xheader.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/id3v2-xheader.mp3'))

  mm(sample, function (err, result) {
    t.error(err)
    var expected = {
      title: 'title',
      artist: [],
      albumartist: [],
      album: '',
      year: '',
      track: { no: 0, of: 0 },
      genre: [],
      disk: { no: 0, of: 0 },
      picture: {},
      duration: 0
    }
    // additional check because deepEqual is not strict
    t.strictEqual(result.year, expected.year, 'year')
    t.deepEqual(result, expected, 'metadata')
    t.end()
  })
})
