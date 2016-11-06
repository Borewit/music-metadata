var path = require('path')
var fs = require('fs')
var Mmd = require('..')
var test = require('tape')

test('invalid "Date" frame should not cause crash', function (t) {
  t.plan(7)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/bug-id3v2-unknownframe.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/bug-id3v2-unknownframe.mp3'))

  Mmd(sample, function (err, result) {
    t.error(err)
    t.strictEqual(result.common.title, 'One', 'title')
    t.strictEqual(result.common.artist[0], 'Coheed And Cambria', 'artist')
    t.strictEqual(result.common.album, 'Year Of The Black Rainbow', 'album')
    t.strictEqual(result.common.year, '2010', 'year')
    t.strictEqual(result.common.track.no, 1, 'track no')
    t.strictEqual(result.common.genre[0], 'Progressive Rock', 'genre')
    t.end()
  })
})
