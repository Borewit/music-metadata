var path = require('path')
var mm = require('..')
var fs = require('fs')
var test = require('tape')

test('asf', function (t) {
  t.plan(23)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/asf.wma')])
    : fs.createReadStream(path.join(__dirname, '/samples/asf.wma'))

  mm(sample, function (err, result) {
    t.error(err)
    t.strictEqual(result.common.title, "Don't Bring Me Down", 'title')
    t.deepEqual(result.common.artist, ['Electric Light Orchestra'], 'artist')
    t.deepEqual(result.common.albumartist, ['Electric Light Orchestra'], 'albumartist')
    t.strictEqual(result.common.album, 'Discovery', 'album')
    t.strictEqual(result.common.year, '2001', 'year')
    t.deepEqual(result.common.track, {no: 9, of: 0}, 'track 9/0')
    t.deepEqual(result.common.disk, {no: 0, of: 0}, 'disk 0/0')
    t.deepEqual(result.common.genre, ['Rock'], 'genre')
    t.strictEqual(result.common.duration, 244.885, 'duration')
    t.end()
  }) // aliased tests
    .on('title', function (result) {
      t.strictEqual(result, "Don't Bring Me Down")
    })
    .on('artist', function (result) {
      t.strictEqual(result[0], 'Electric Light Orchestra', 'aliased artist')
    })
    .on('albumartist', function (result) {
      t.strictEqual(result[0], 'Electric Light Orchestra', 'aliased albumartist')
    })
    .on('album', function (result) {
      t.strictEqual(result, 'Discovery', 'aliased album')
    })
    .on('year', function (result) {
      t.strictEqual(result, '2001', 'aliased year')
    })
    .on('track', function (result) {
      t.strictEqual(result.no, 9, 'aliased track no')
      t.strictEqual(result.of, 0, 'aliased track of')
    })
    .on('genre', function (result) {
      t.strictEqual(result[0], 'Rock', 'aliased genre')
    })
    .on('duration', function (result) {
      t.strictEqual(result, 244.885, 'aliased duration')
    })
    // raw tests
    .on('WM/AlbumTitle', function (result) {
      t.strictEqual(result, 'Discovery')
    })
    .on('WM/BeatsPerMinute', function (result) {
      t.strictEqual(result, 117)
    })
    .on('REPLAYGAIN_TRACK_GAIN', function (result) {
      t.strictEqual(result, '-4.7 dB')
    })
})
