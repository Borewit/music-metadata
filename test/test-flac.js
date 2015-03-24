var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('prova')

test('flac', function (t) {
  t.plan(38)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/flac.flac')])
    : fs.createReadStream(path.join(__dirname, '/samples/flac.flac'))

  mm(sample, function (err, result) {
    t.error(err)
    t.strictEqual(result.title, 'Brian Eno', 'title')
    t.strictEqual(result.artist[0], 'MGMT', 'artist')
    t.strictEqual(result.albumartist.length, 0, 'albumartist length')
    t.strictEqual(result.album, 'Congratulations', 'album')
    t.strictEqual(result.year, '2010', 'year')
    t.strictEqual(result.track.no, 7, 'track no')
    t.strictEqual(result.track.of, 0, 'track of')
    t.strictEqual(result.disk.no, 0, 'disk no')
    t.strictEqual(result.disk.of, 0, 'disk of')
    t.strictEqual(result.genre[0], 'Alt. Rock', 'genre')
    t.strictEqual(result.picture[0].format, 'jpg', 'picture format')
    t.strictEqual(result.picture[0].data.length, 175668, 'picture length')
    t.strictEqual(result.duration, 272, 'duration')
    t.end()
  })
    // aliased tests
    .on('title', function (result) {
      t.strictEqual(result, 'Brian Eno', 'aliased title')
    })
    .on('artist', function (result) {
      t.strictEqual(result[0], 'MGMT', 'aliased artist')
    })
    .on('year', function (result) {
      t.strictEqual(result, '2010', 'aliased year')
    })
    .on('track', function (result) {
      t.strictEqual(result.no, 7, 'aliased track no')
      t.strictEqual(result.of, 0, 'aliased track of')
    })
    .on('genre', function (result) {
      t.strictEqual(result[0], 'Alt. Rock', 'aliased genre')
    })
    .on('picture', function (result) {
      t.strictEqual(result[0].format, 'jpg', 'aliased picture format')
      t.strictEqual(result[0].data.length, 175668, 'aliased picture length')
    })
    .on('comment', function (result) {
      t.strictEqual(result[0], 'EAC-Secure Mode', 'aliased comment')
    })
    .on('duration', function (result) {
      t.strictEqual(result, 272, 'aliased duration')
    })
    // raw tests
    .on('TITLE', function (result) {
      t.strictEqual(result, 'Brian Eno', 'raw TITLE')
    })
    .on('ARTIST', function (result) {
      t.strictEqual(result, 'MGMT', 'raw ARTIST')
    })
    .on('DATE', function (result) {
      t.strictEqual(result, '2010', 'raw DATE')
    })
    .on('TRACKNUMBER', function (result) {
      t.strictEqual(result, '07', 'raw TRACKNUMBER')
    })
    .on('GENRE', function (result) {
      t.strictEqual(result, 'Alt. Rock', 'raw GENRE')
    })
    .on('COMMENT', function (result) {
      t.strictEqual(result, 'EAC-Secure Mode', 'raw COMMENT')
    })
    .on('METADATA_BLOCK_PICTURE', function (result) {
      t.strictEqual(result.type, 'Cover (front)', 'raw METADATA_BLOCK_PICTURE type')
      t.strictEqual(result.format, 'image/jpeg', 'raw METADATA_BLOCK_PICTURE format')
      t.strictEqual(result.description, '', 'raw METADATA_BLOCK_PICTURE description')
      t.strictEqual(result.width, 450, 'raw METADATA_BLOCK_PICTURE width')
      t.strictEqual(result.height, 450, 'raw METADATA_BLOCK_PICTURE height')
      t.strictEqual(result.colour_depth, 24, 'raw METADATA_BLOCK_PICTURE colour depth')
      t.strictEqual(result.indexed_color, 0, 'raw METADATA_BLOCK_PICTURE indexed_color')
      t.strictEqual(result.data.length, 175668, 'raw METADATA_BLOCK_PICTURE length')
    })
})
