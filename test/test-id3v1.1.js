var path   = require('path');
var fs     = require('fs');
var id3    = require('../lib/index');
var test   = require('tape');

test('id3v1.1', function (t) {
  t.plan(16);
  new id3(fs.createReadStream(path.join(__dirname, 'samples/id3v1.mp3')))
    .on('metadata', function (result) {
      t.strictEqual(result.title, 'Blood Sugar', 'title');
      t.strictEqual(result.artist[0], 'Pendulum', 'artist');
      t.strictEqual(result.albumartist.length, 0, 'albumartist length');
      t.strictEqual(result.album, 'Blood Sugar (Single)', 'album');
      t.strictEqual(result.year, '2007', 'year');
      t.strictEqual(result.track.no, 1, 'track no');
      t.strictEqual(result.track.of, 0, 'track of');
      t.strictEqual(result.genre[0], 'Electronic', 'genre');
    })
    .on('title', function (result) {
      t.strictEqual(result, 'Blood Sugar', 'title');
    })
    .on('artist', function (result) {
      t.strictEqual(result[0], 'Pendulum', 'artist');
    })
    .on('album', function (result) {
      t.strictEqual(result, 'Blood Sugar (Single)', 'album');
    })
    .on('year', function (result) {
      t.strictEqual(result, '2007', 'year');
    })
    .on('track', function (result) {
      t.strictEqual(result.no, 1, 'track no');
      t.strictEqual(result.of, 0, 'track of');
    })
    .on('genre', function (result) {
      t.strictEqual(result[0], 'Electronic', 'genre');
    })
    .on('comment', function (result) {
      t.strictEqual(result[0], 'abcdefg', 'comment');
    })
    .on('done', function (err) {
      if (err) throw err;
      t.end();
    });
});