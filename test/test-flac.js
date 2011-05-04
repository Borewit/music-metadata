var mm = require('../lib/index'),
    fs = require('fs'),
    assert = require('assert'),
    testHelper = require('./testHelper');
      
var sample = require('path').join(__dirname, 'samples/flac.flac');
var parser = new mm(fs.createReadStream(sample));

var testHelper = new testHelper(27, __filename);

parser.on('metadata', function(result) {
  assert.strictEqual(result.title, 'Brian Eno');
  assert.deepEqual(result.artist, ['MGMT']);
  assert.deepEqual(result.albumartist, []);
  assert.strictEqual(result.album, 'Congratulations');
  assert.strictEqual(result.year, 2010);
  assert.strictEqual(result.track.no, 7);
  assert.strictEqual(result.track.of, 0);
  assert.strictEqual(result.disk.no, 0);
  assert.strictEqual(result.disk.of, 0);
  assert.deepEqual(result.genre, ['Alt. Rock']);
  assert.strictEqual(result.picture.format, 'jpg');
  assert.strictEqual(result.picture.data.length, 175668);
  testHelper.ranTests(12);
});

//Aliased tests

parser.on('title', function(result) {
  assert.strictEqual(result, 'Brian Eno');
  testHelper.ranTests(1);
});

parser.on('artist', function(result) {
  assert.strictEqual(result, 'MGMT');
  testHelper.ranTests(1);
});

parser.on('year', function(result) {
  assert.strictEqual(result, '2010');
  testHelper.ranTests(1);
});

parser.on('track', function(result) {
  assert.strictEqual(result, '07');
  testHelper.ranTests(1);
});

parser.on('genre', function(result) {
  assert.strictEqual(result, 'Alt. Rock');
  testHelper.ranTests(1);
});

parser.on('picture', function(result) {
  assert.strictEqual(result.format, 'image/jpeg');
  assert.strictEqual(result.data.length, 175668);
  testHelper.ranTests(2);
});

//Raw tests

parser.on('TITLE', function(result) {
  assert.strictEqual(result, 'Brian Eno');
  testHelper.ranTests(1);
});

parser.on('ARTIST', function(result) {
  assert.strictEqual(result, 'MGMT');
  testHelper.ranTests(1);
});

parser.on('DATE', function(result) {
  assert.strictEqual(result, '2010');
  testHelper.ranTests(1);
});

parser.on('TRACKNUMBER', function(result) {
  assert.strictEqual(result, '07');
  testHelper.ranTests(1);
});

parser.on('GENRE', function(result) {
  assert.strictEqual(result, 'Alt. Rock');
  testHelper.ranTests(1);
});

parser.on('METADATA_BLOCK_PICTURE', function(result) {
  assert.strictEqual(result.format, 'image/jpeg');
  assert.strictEqual(result.data.length, 175668);
  testHelper.ranTests(2);
});

parser.on('done', function(err) {
  if (err) throw err;
  testHelper.ranTests(1);
});