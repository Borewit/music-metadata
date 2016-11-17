var id3 = require('..')
var fs = require('fs')
var path = require('path')
var test = require('tape')

test('should read utf16bom encoded metadata correctly', function (t) {
  t.plan(9)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/bug-utf16bom-encoding.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/bug-utf16bom-encoding.mp3'))

  id3(sample, function (err, result) {
    t.error(err)
    t.equal(result.common.title, "It's All Over You Know", 'title')
    t.equal(result.common.artist[0], 'The Apers', 'artist')
    t.equal(result.common.albumartist[0], 'The Apers', 'albumartist')
    t.equal(result.common.album, 'Reanimate My Heart', 'album')
    t.equal(result.common.year, '2007', 'year')
    t.equal(result.common.track.no, 1, 'track no')
    t.equal(result.common.track.of, 0, 'track of')
    t.equal(result.common.genre[0], 'Punk Rock', 'genre')
    t.end()
  })
})
