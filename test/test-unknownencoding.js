var fs = require('fs')
var path = require('path')
var mm = require('..')
var test = require('tape')

test('should be able to read metadata with unknown encoding', function (t) {
  t.plan(11)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/bug-unkown encoding.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/bug-unkown encoding.mp3'))

  mm(sample, function (err, result) {
    t.error(err)
    t.strictEqual(result.common.title, '808', 'title')
    t.strictEqual(result.common.artist[0], 'Benga', 'artist')
    t.strictEqual(result.common.albumartist[0], 'Benga', 'albumartist')
    t.strictEqual(result.common.album, 'Phaze One', 'album')
    t.strictEqual(result.common.year, '2010', 'year')
    t.strictEqual(result.common.track.no, 4, 'track no')
    t.strictEqual(result.common.track.of, 8, 'track of')
    t.strictEqual(result.common.genre[0], 'Dubstep', 'genre')
    t.strictEqual(result.common.picture[0].format, 'jpg', 'picture format')
    t.strictEqual(result.common.picture[0].data.length, 6761, 'picture length')
    t.end()
  })

})
