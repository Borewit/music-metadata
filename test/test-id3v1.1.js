var id3 = require('../lib/index'),
    fs = require('fs'),
    testy = require('testy'),
    assert = testy.assert;

testy.expected = 17;

var sample = require('path').join(__dirname, 'samples/id3v1.mp3');
var parser = new id3(fs.createReadStream(sample, { bufferSize: 10 }));

parser.on('metadata', function(result) {
  assert.strictEqual(result.title, 'Blood Sugar');
  assert.strictEqual(result.artist[0], 'Pendulum');
  assert.strictEqual(result.albumartist.length, 0);
  assert.strictEqual(result.album, 'Blood Sugar (Single)');
  assert.strictEqual(result.year, 2007);
  assert.strictEqual(result.track.no, 1);
  assert.strictEqual(result.track.of, 0);
  assert.strictEqual(result.genre[0], 'Electronic');
});

parser.on('title', function(result) {
  assert.strictEqual(result, 'Blood Sugar');
});

parser.on('artist', function(result) {
  assert.strictEqual(result[0], 'Pendulum');
});

parser.on('album', function(result) {
  assert.strictEqual(result, 'Blood Sugar (Single)');
});

parser.on('year', function(result) {
  assert.strictEqual(result, 2007);
});

parser.on('track', function(result) {
  assert.strictEqual(result.no, 1);
  assert.strictEqual(result.of, 0);
});

parser.on('genre', function(result) {
  assert.strictEqual(result[0], 'Electronic');
});

parser.on('comment', function(result) {
  assert.strictEqual(result[0], 'abcdefg');
});

parser.on('done', function(err) {
  if (err) throw err;
  assert.ok(true);
  testy.finish();
});