var id3 = require('../lib/index'),
    fs = require('fs'),
    assert = require('assert'),
    testHelper = require('./testHelper');

var testHelper = new testHelper(17, __filename);
var sample = require('path').join(__dirname, 'samples/id3v1.mp3');
var parser = new id3(fs.createReadStream(sample));

parser.on('metadata', function(result) {
  assert.strictEqual(result.title, 'Blood Sugar');
  assert.strictEqual(result.artist[0], 'Pendulum');
  assert.strictEqual(result.albumartist.length, 0);
  assert.strictEqual(result.album, 'Blood Sugar (Single)');
  assert.strictEqual(result.year, 2007);
  assert.strictEqual(result.track.no, 1);
  assert.strictEqual(result.track.of, 0);
  assert.strictEqual(result.genre[0], 'Electronic');
  testHelper.ranTests(8);
});

parser.on('title', function(result) {
  assert.strictEqual(result, 'Blood Sugar');
  testHelper.ranTests(1);
});

parser.on('artist', function(result) {
  assert.strictEqual(result[0], 'Pendulum');
  testHelper.ranTests(1);
});

parser.on('album', function(result) {
  assert.strictEqual(result, 'Blood Sugar (Single)');
  testHelper.ranTests(1);
});

parser.on('year', function(result) {
  assert.strictEqual(result, 2007);
  testHelper.ranTests(1);
});

parser.on('track', function(result) {
  assert.strictEqual(result.no, 1);
  assert.strictEqual(result.of, 0);
  testHelper.ranTests(2);
});

parser.on('genre', function(result) {
  assert.strictEqual(result[0], 'Electronic');
  testHelper.ranTests(1);
});

parser.on('comment', function(result) {
  assert.strictEqual(result[0], 'abcdefg');
  testHelper.ranTests(1);
});

parser.on('done', function(err) {
  if (err) throw err;
  testHelper.ranTests(1);
});