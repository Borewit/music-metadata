var mm = require('../lib/index'),
    fs = require('fs'),
    testy = require('testy'),
    assert = testy.assert;

testy.expected = 34;

var sample = require('path').join(__dirname, 'samples/monkeysaudio.ape');
var parser = new mm(fs.createReadStream(sample));

parser.on('metadata', function(result) {
  assert.strictEqual(result.title, '07. Shadow On The Sun');
  assert.strictEqual(result.artist[0], 'Audioslave');
  assert.strictEqual(result.artist[1], 'Chris Cornell');
  assert.strictEqual(result.albumartist[0], 'Audioslave');
  assert.strictEqual(result.album, 'Audioslave');
  assert.strictEqual(result.year, '2002');
  assert.strictEqual(result.genre[0], 'Alternative');
  assert.strictEqual(result.track.no, 7);
  assert.strictEqual(result.disk.no, 3);
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
  assert.strictEqual(result[0], 'Audioslave');
  assert.strictEqual(result[1], 'Chris Cornell');
});

parser.on('albumartist', function(result) {
  assert.strictEqual(result[0], 'Audioslave');
});

parser.on('album', function(result) {
  assert.strictEqual(result, 'Audioslave');
});

parser.on('track', function(result) {
  assert.strictEqual(result.no, 7);
});

parser.on('disk', function(result) {
  assert.strictEqual(result.no, 3);
});

parser.on('year', function(result) {
  assert.strictEqual(result, '2002');
});

parser.on('genre', function(result) {
  assert.strictEqual(result[0], 'Alternative');
});

parser.on('picture', function(result) {
  assert.strictEqual(result[0].format, 'jpg');
  assert.strictEqual(result[0].data.length, 48658);
  assert.strictEqual(result[1].format, 'jpg');
  assert.strictEqual(result[1].data.length, 48658);
});

parser.on('comment', function(result) {
  assert.strictEqual(result[0], 'This is a sample ape file');
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
  testy.finish();
});