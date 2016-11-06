var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test('monkeysaudio (.ape)', function (t) {
  t.plan(32) // -1 due to missing albumartist
  var artistCounter = 0

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/monkeysaudio.ape')])
    : fs.createReadStream(path.join(__dirname, '/samples/monkeysaudio.ape'))

  mm(sample, function (err, result) {
    t.error(err)
    t.strictEqual(result.title, '07. Shadow On The Sun', 'title')
    t.deepEqual(result.artist, ['Audioslave', 'Chris Cornell'], 'artist')
    // Used to be ['Audioslave'], but 'APEv2/Album Artist'->'albumartist' is not set in actual file!
    t.deepEqual(result.albumartist, [], 'albumartist')
    t.strictEqual(result.album, 'Audioslave', 'album')
    t.strictEqual(result.year, '2002', 'year')
    t.deepEqual(result.genre, ['Alternative'], 'genre')
    t.deepEqual(result.track, { no: 7, of: 0 }, 'track')
    t.deepEqual(result.disk, { no: 3, of: 0 }, 'disk')
    t.strictEqual(result.picture[0].format, 'jpg', 'picture 0 format')
    t.strictEqual(result.picture[0].data.length, 48658, 'picture 0 length')
    t.strictEqual(result.picture[1].format, 'jpg', 'picture 1 format')
    t.strictEqual(result.picture[1].data.length, 48658, 'picture 1 length')
    t.end()
  })
    // aliased tests
    .on('title', function (result) {
      t.strictEqual(result, '07. Shadow On The Sun', 'aliased title')
    })
    .on('artist', function (result) {
      t.deepEqual(result, ['Audioslave', 'Chris Cornell'], 'aliased artist')
    })
    .on('albumartist', function (result) {
      // Used to be ['Audioslave'],
      // but 'APEv2/Album Artist'->'albumartist' is not set in actual file!
      t.deepEqual(result, [], 'aliased albumartist')
    })
    .on('album', function (result) {
      t.strictEqual(result, 'Audioslave', 'aliased album')
    })
    .on('track', function (result) {
      t.deepEqual(result, { no: 7, of: 0 }, 'aliased track')
    })
    .on('disk', function (result) {
      t.deepEqual(result, { no: 3, of: 0 }, 'aliased disk')
    })
    .on('year', function (result) {
      t.strictEqual(result, '2002', 'aliased year')
    })
    .on('genre', function (result) {
      t.deepEqual(result, ['Alternative'], 'aliased genre')
    })
    .on('picture', function (result) {
      t.strictEqual(result[0].format, 'jpg', 'aliased picture 0 format')
      t.strictEqual(result[0].data.length, 48658, 'aliased picture 0 length')
      t.strictEqual(result[1].format, 'jpg', 'aliased picture 1 format')
      t.strictEqual(result[1].data.length, 48658, 'aliased picture 1 length')
    })
    .on('comment', function (result) {
      t.deepEqual(result, ['This is a sample ape file'], 'aliased comment')
    })
    // raw tests
    .on('ENSEMBLE', function (result) {
      t.strictEqual(result, 'Audioslave', 'raw ensemble')
    })
    .on('Artist', function (result) {
      if (artistCounter === 0) {
        t.strictEqual(result, 'Audioslave', 'raw artist 0')
      }
      if (artistCounter === 1) {
        t.strictEqual(result, 'Chris Cornell', 'raw artist 1')
      }
      artistCounter++
    })
    .on('Cover Art (Front)', function (result) {
      t.strictEqual(result.description,
        'Cover Art (Front).jpg', 'raw cover art (front) description')
      t.strictEqual(result.data.length, 48658, 'raw cover art (front) length')
    })
    .on('Cover Art (Back)', function (result) {
      t.strictEqual(result.description, 'Cover Art (Back).jpg', 'raw cover art (back) description')
      t.strictEqual(result.data.length, 48658, 'raw cover art (back) length')
    })
})
