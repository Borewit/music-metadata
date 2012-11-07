var mm     = require('../lib/index');
var fs     = require('fs');
var testy  = require('testy')();
var assert = testy.assert;

testy.expected = 32;

var sample = require('path').join(__dirname, 'samples/monkeysaudio.ape');
var parser = new mm(fs.createReadStream(sample));

parser.on('metadata', function(result) {
  assert.strictEqual(result.title, '07. Shadow On The Sun');
  assert.deepEqual(result.artist, ['Audioslave', 'Chris Cornell']);
  assert.deepEqual(result.albumartist, ['Audioslave']);
  assert.strictEqual(result.album, 'Audioslave');
  assert.strictEqual(result.year, '2002');
  assert.deepEqual(result.genre, ['Alternative']);
  assert.deepEqual(result.track, { no : 7, of : 0 });
  assert.deepEqual(result.disk, { no : 3, of : 0 });
  assert.strictEqual(result.picture[0].format, 'jpg');
  assert.strictEqual(result.picture[0].data.length, 48658);
  assert.strictEqual(result.picture[1].format, 'jpg');
  assert.strictEqual(result.picture[1].data.length, 48658);
});

//Aliased tests
parser.on('title', function(result) {
  assert.strictEqual(result, '07. Shadow On The Sun');
});

parser.on('artist', function(result) {
  assert.deepEqual(result, ['Audioslave', 'Chris Cornell']);
});

parser.on('albumartist', function(result) {
  assert.deepEqual(result, ['Audioslave']);
});

parser.on('album', function(result) {
  assert.strictEqual(result, 'Audioslave');
});

parser.on('track', function(result) {
  assert.deepEqual(result, { no : 7, of : 0 });
});

parser.on('disk', function(result) {
  assert.deepEqual(result, { no : 3, of : 0 });
});

parser.on('year', function(result) {
  assert.strictEqual(result, '2002');
});

parser.on('genre', function(result) {
  assert.deepEqual(result, ['Alternative']);
});

parser.on('picture', function(result) {
  assert.strictEqual(result[0].format, 'jpg');
  assert.strictEqual(result[0].data.length, 48658);
  assert.strictEqual(result[1].format, 'jpg');
  assert.strictEqual(result[1].data.length, 48658);
});

parser.on('comment', function(result) {
  assert.deepEqual(result, ['This is a sample ape file']);
});

//Raw tests
parser.on('ENSEMBLE', function(result) {
  assert.strictEqual(result, 'Audioslave');
});

parser.on('Artist', function(result) {
  assert.strictEqual(result, 'Audioslave/Chris Cornell');
});

parser.on('Cover Art (Front)', function(result) {
  assert.strictEqual(result.description, 'Cover Art (Front).jpg');
  assert.strictEqual(result.data.length, 48658);
});

parser.on('Cover Art (Back)', function(result) {
  assert.strictEqual(result.description, 'Cover Art (Back).jpg');
  assert.strictEqual(result.data.length, 48658);
});

parser.on('done', function(err) {
  if (err) throw err;
  assert.ok(true);
});