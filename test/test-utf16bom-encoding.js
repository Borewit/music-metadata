var mm = require('..')
var fs = require('fs')
var path = require('path')
var test = require('tape')

test('should read utf16bom encoded metadata correctly', function (t) {
  t.plan(9)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/bug-utf16bom-encoding.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/bug-utf16bom-encoding.mp3'))

  mm.parseStream(sample, function (err, result) {
    t.error(err)
    t.equal(result.common.title, "It's All Over You Know", 'title')
    t.equal(result.common.artist, 'The Apers', 'artist')
    t.deepEqual(result.common.artists, ['The Apers'], 'artist')
    t.equal(result.common.albumartist, 'The Apers', 'albumartist')
    t.equal(result.common.album, 'Reanimate My Heart', 'album')
    t.equal(result.common.year, 2007, 'year')
    t.deepEqual(result.common.track, {no: 1, of: null}, 'track')
    t.deepEqual(result.common.genre, ['Punk Rock'], 'genre')
    t.end()
  })
})
