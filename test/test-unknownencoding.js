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
    t.equal(result.title, '808', 'title')
    t.equal(result.artist[0], 'Benga', 'artist')
    t.equal(result.albumartist[0], 'Benga', 'albumartist')
    t.equal(result.album, 'Phaze One', 'album')
    t.equal(result.year, '2010', 'year')
    t.equal(result.track.no, 4, 'track no')
    t.equal(result.track.of, 8, 'track of')
    t.equal(result.genre[0], 'Dubstep', 'genre')
    t.equal(result.picture[0].format, 'jpg', 'picture format')
    t.equal(result.picture[0].data.length, 6761, 'picture length')
    t.end()
  })

})
