var mm     = require('../lib/index');
var fs     = require('fs');
var testy  = require('testy')();
var assert = testy.assert;
      
testy.expected = 36;

var sample = require('path').join(__dirname, 'samples/flac.flac');
var parser = new mm(fs.createReadStream(sample));

parser.on('metadata', function(result) {
  assert.strictEqual(result.title, 'Brian Eno');
  assert.strictEqual(result.artist[0], 'MGMT');
  assert.strictEqual(result.albumartist.length, 0);
  assert.strictEqual(result.album, 'Congratulations');
  assert.strictEqual(result.year, '2010');
  assert.strictEqual(result.track.no, 7);
  assert.strictEqual(result.track.of, 0);
  assert.strictEqual(result.disk.no, 0);
  assert.strictEqual(result.disk.of, 0);
  assert.strictEqual(result.genre[0], 'Alt. Rock');
  assert.strictEqual(result.picture[0].format, 'jpg');
  assert.strictEqual(result.picture[0].data.length, 175668);
});

//Aliased tests
parser.on('title', function(result) {
  assert.strictEqual(result, 'Brian Eno');
});

parser.on('artist', function(result) {
  assert.strictEqual(result[0], 'MGMT');
});

parser.on('year', function(result) {
  assert.strictEqual(result, '2010');
});

parser.on('track', function(result) {
  assert.strictEqual(result.no, 7);
  assert.strictEqual(result.of, 0);
});

parser.on('genre', function(result) {
  assert.strictEqual(result[0], 'Alt. Rock');
});

parser.on('picture', function(result) {
  assert.strictEqual(result[0].format, 'jpg');
  assert.strictEqual(result[0].data.length, 175668);
});

parser.on('comment', function(result) {
  assert.strictEqual(result[0], 'EAC-Secure Mode');
});

//Raw tests
parser.on('TITLE', function(result) {
  assert.strictEqual(result, 'Brian Eno');
});

parser.on('ARTIST', function(result) {
  assert.strictEqual(result, 'MGMT');
});

parser.on('DATE', function(result) {
  assert.strictEqual(result, '2010');
});

parser.on('TRACKNUMBER', function(result) {
  assert.strictEqual(result, '07');
});

parser.on('GENRE', function(result) {
  assert.strictEqual(result, 'Alt. Rock');
});

parser.on('COMMENT', function(result) {
  assert.strictEqual(result, 'EAC-Secure Mode');
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
});

parser.on('done', function(err) {
  if (err) throw err;
  assert.ok(true);
});