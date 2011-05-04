var id3 = require('../lib/index'),
    fs = require('fs'),
    assert = require('assert'),
    testHelper = require('./testHelper');

var sample = require('path').join(__dirname, 'samples/id3v1.mp3');
var parser = new id3(fs.createReadStream(sample));

var testHelper = new testHelper(16, __filename);

parser.on('metadata', function(result) {
  assert.strictEqual(result.title, 'Blood Sugar');
  assert.deepEqual(result.artist, ['Pendulum']);
  //we can't do assert.strictEqual(result.albumartist, []); :(
  assert.strictEqual(result.albumartist[0], undefined);
  assert.strictEqual(result.album, 'Blood Sugar (Single)');
  assert.strictEqual(result.year, 2007);
  assert.strictEqual(result.track[0], 1);
  assert.strictEqual(result.track[1], 0);
  assert.deepEqual(result.genre, ['Electronic']);
  testHelper.ranTests(8);
});

parser.on('title', function(result) {
  assert.strictEqual(result, 'Blood Sugar');
  testHelper.ranTests(1);
});

parser.on('artist', function(result) {
  assert.strictEqual(result, 'Pendulum');
  testHelper.ranTests(1);
});

parser.on('album', function(result) {
  assert.strictEqual(result, 'Blood Sugar (Single)');
  testHelper.ranTests(1);
});

parser.on('year', function(result) {
  assert.strictEqual(result, '2007');
  testHelper.ranTests(1);
});

parser.on('track', function(result) {
  assert.strictEqual(result, 1);
  testHelper.ranTests(1);
});

parser.on('genre', function(result) {
  assert.deepEqual(result, 'Electronic');
  testHelper.ranTests(1);
});

parser.on('comment', function(result) {
  assert.strictEqual(result, 'abcdefg');
  testHelper.ranTests(1);
});

parser.on('done', function(err) {
  if (err) throw err;
  testHelper.ranTests(1);
});