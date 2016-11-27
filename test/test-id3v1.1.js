
var path = require('path')
var fs = require('fs')
var id3 = require('..')
var test = require('tape')

test('id3v1.1', function (t) {
  t.plan(18)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/id3v1.mp3')])
    : fs.createReadStream(path.join(__dirname, 'samples/id3v1.mp3'))

  function checkFormat (format) {
    t.strictEqual(format.headerType, 'id3v1.1', 'format.tag_type')
  }

  id3(sample, function (err, result) {
    t.error(err)

    checkFormat(result.format)

    t.strictEqual(result.common.title, 'Blood Sugar', 'title')
    t.strictEqual(result.common.artist[0], 'Pendulum', 'artist')
    t.strictEqual(result.common.albumartist.length, 0, 'albumartist length')
    t.strictEqual(result.common.album, 'Blood Sugar (Single)', 'album')
    t.strictEqual(result.common.year, '2007', 'year')
    t.strictEqual(result.common.track.no, 1, 'track no')
    t.strictEqual(result.common.track.of, 0, 'track of')
    t.deepEqual(result.common.genre, ['Electronic'], 'genre')
    t.end()
  })
    .on('title', function (result) {
      t.strictEqual(result, 'Blood Sugar', 'title')
    })
    .on('artist', function (result) {
      t.strictEqual(result[0], 'Pendulum', 'artist')
    })
    .on('album', function (result) {
      t.strictEqual(result, 'Blood Sugar (Single)', 'album')
    })
    .on('year', function (result) {
      t.strictEqual(result, '2007', 'year')
    })
    .on('track', function (result) {
      t.strictEqual(result.no, 1, 'track no')
      t.strictEqual(result.of, 0, 'track of')
    })
    .on('genre', function (result) {
      t.strictEqual(result[0], 'Electronic', 'genre')
    })
    .on('comment', function (result) {
      t.strictEqual(result[0], 'abcdefg', 'comment')
    })
})

module.exports = (stream, opts, callback) => {
  return new Id3v1Parser.parse(stream, opts, callback)
}
