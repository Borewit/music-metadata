var path = require('path')
var mm = require('..')
var fs = require('fs')
var test = require('tape')

test('asf', function (t) {
  t.plan(22)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/asf.wma')])
    : fs.createReadStream(path.join(__dirname, '/samples/asf.wma'))

  mm.parseStream(sample, function (err, result) {
    t.error(err)
    t.strictEqual(result.format.duration, 244.885, 'duration')

    t.strictEqual(result.common.title, "Don't Bring Me Down", 'common.title')
    t.deepEqual(result.common.artist, 'Electric Light Orchestra', 'common.artist')
    t.deepEqual(result.common.albumartist, 'Electric Light Orchestra', 'common.albumartist')
    t.strictEqual(result.common.album, 'Discovery', 'common.album')
    t.strictEqual(result.common.year, 2001, 'common.year')
    t.deepEqual(result.common.track, {no: 9, of: null}, 'common.track 9/0')
    t.deepEqual(result.common.disk, {no: null, of: null}, 'common.disk 0/0')
    t.deepEqual(result.common.genre, ['Rock'], 'common.genre')
    t.end()
  }) // aliased tests
    .on('title', function (result) {
      t.strictEqual(result, "Don't Bring Me Down")
    })
    .on('artist', function (result) {
      t.strictEqual(result, 'Electric Light Orchestra', 'aliased artist')
    })
    .on('albumartist', function (result) {
      t.strictEqual(result, 'Electric Light Orchestra', 'aliased albumartist')
    })
    .on('album', function (result) {
      t.strictEqual(result, 'Discovery', 'aliased album')
    })
    .on('year', function (result) {
      t.strictEqual(result, 2001, 'aliased year')
    })
    .on('track', function (result) {
      t.strictEqual(result.no, 9, 'aliased track no')
      t.strictEqual(result.of, null, 'aliased track of')
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
