var path   = require('path');
var mm     = require('..');
var fs     = require('fs');
var test   = require('tap').test;

test('asf', function (t) {
  t.plan(22);
  var sample = path.join(__dirname, 'samples/asf.wma');
  new mm(fs.createReadStream(sample))
    .on('metadata', function (result) {
      t.strictEqual(result.title, 'Don\'t Bring Me Down', 'title');
      t.strictEqual(result.artist[0], 'Electric Light Orchestra', 'artist');
      t.strictEqual(result.albumartist[0], 'Electric Light Orchestra', 'albumartist');
      t.strictEqual(result.album, 'Discovery', 'album');
      t.strictEqual(result.year, '2001', 'year');
      t.strictEqual(result.track.no, 9, 'track no');
      t.strictEqual(result.track.of, 0, 'track of');
      t.strictEqual(result.disk.no, 0, 'disk no');
      t.strictEqual(result.disk.of, 0, 'disk of');
      t.strictEqual(result.genre[0], 'Rock', 'genre 0');
    })
    // aliased tests
    .on('title', function (result) {
      t.strictEqual(result, 'Don\'t Bring Me Down');
    })
    .on('artist', function (result) {
      t.strictEqual(result[0], 'Electric Light Orchestra', 'aliased artist');
    })
    .on('albumartist', function (result) {
      t.strictEqual(result[0], 'Electric Light Orchestra', 'aliased albumartist');
    })
    .on('album', function (result) {
      t.strictEqual(result, 'Discovery', 'aliased album');
    })
    .on('year', function (result) {
      t.strictEqual(result, '2001', 'aliased year');
    })
    .on('track', function (result) {
      t.strictEqual(result.no, 9, 'aliased track no');
      t.strictEqual(result.of, 0, 'aliased track of');
    })
    .on('genre', function (result) {
      t.strictEqual(result[0], 'Rock', 'aliased genre');
    })
    // raw tests
    .on('WM/AlbumTitle', function (result) {
      t.strictEqual(result, 'Discovery');
    })
    .on('WM/BeatsPerMinute', function (result) {
      t.strictEqual(result, 117);
    })
    .on('REPLAYGAIN_TRACK_GAIN', function (result) {
      t.strictEqual(result, '-4.7 dB')
    })
    .on('done', function(err) {
      t.ok(err == null, 'error should be null');
      t.end();
    })
})
