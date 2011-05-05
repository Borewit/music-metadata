var mm = require('../lib/index'),
    fs = require('fs'),
    assert = require('assert'),
    testHelper = require('./testHelper');
      
var testHelper = new testHelper(36, __filename);
var sample = require('path').join(__dirname, 'samples/flac.flac');
var parser = new mm(fs.createReadStream(sample));

parser.on('metadata', function(result) {
  assert.strictEqual(result.title, 'Brian Eno');
  assert.strictEqual(result.artist[0], 'MGMT');
  assert.strictEqual(result.albumartist.length, 0);
  assert.strictEqual(result.album, 'Congratulations');
  assert.strictEqual(result.year, 2010);
  assert.strictEqual(result.track.no, 7);
  assert.strictEqual(result.track.of, 0);
  assert.strictEqual(result.disk.no, 0);
  assert.strictEqual(result.disk.of, 0);
  assert.strictEqual(result.genre[0], 'Alt. Rock');
  assert.strictEqual(result.picture[0].format, 'jpg');
  assert.strictEqual(result.picture[0].data.length, 175668);
  testHelper.ranTests(12);
});

//Aliased tests
parser.on('title', function(result) {
  assert.strictEqual(result, 'Brian Eno');
  testHelper.ranTests(1);
});

parser.on('artist', function(result) {
  assert.strictEqual(result[0], 'MGMT');
  testHelper.ranTests(1);
});

parser.on('year', function(result) {
  assert.strictEqual(result, 2010);
  testHelper.ranTests(1);
});

parser.on('track', function(result) {
  assert.strictEqual(result.no, 7);
  assert.strictEqual(result.of, 0);
  testHelper.ranTests(2);
});

parser.on('genre', function(result) {
  assert.strictEqual(result[0], 'Alt. Rock');
  testHelper.ranTests(1);
});

parser.on('picture', function(result) {
  assert.strictEqual(result[0].format, 'jpg');
  assert.strictEqual(result[0].data.length, 175668);
  testHelper.ranTests(2);
});

parser.on('comment', function(result) {
  assert.strictEqual(result[0], 'EAC-Secure Mode');
  testHelper.ranTests(1);
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

parser.on('COMMENT', function(result) {
  assert.strictEqual(result, 'EAC-Secure Mode');
  testHelper.ranTests(1);
});

parser.on('METADATA_BLOCK_PICTURE', function(result) {
  assert.strictEqual(result.type, 'Cover (front)');
  assert.strictEqual(result.format, 'image/jpeg');
  assert.strictEqual(result.description, '');
  assert.strictEqual(result.width, 450);
  assert.strictEqual(result.height, 450);
  assert.strictEqual(result.colour_depth, 24);
  assert.strictEqual(result.indexed_color, 0);
  assert.strictEqual(result.data.length, 175668);
  testHelper.ranTests(8);
});

parser.on('done', function(err) {
  if (err) throw err;
  testHelper.ranTests(1);
});