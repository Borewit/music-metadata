var id3    = require('../lib/index');
var fs     = require('fs');
var testy  = require('testy')();
var assert = testy.assert;
    
testy.expected = 47;

var sample = require('path').join(__dirname, 'samples/id4.m4a');
var parser = new id3(fs.createReadStream(sample));

parser.on('metadata', function(result) {
  assert.strictEqual(result.title, 'Voodoo People (Pendulum Remix)');
  assert.strictEqual(result.artist[0], 'The Prodigy');
  assert.strictEqual(result.albumartist[0], 'Pendulum');
  assert.strictEqual(result.album, 'Voodoo People');
  assert.strictEqual(result.year, '2005');
  assert.strictEqual(result.track.no, 1);
  assert.strictEqual(result.track.of, 12);
  assert.strictEqual(result.disk.no, 1);
  assert.strictEqual(result.disk.of, 1);
  assert.strictEqual(result.genre[0], 'Electronic');
  assert.strictEqual(result.picture[0].format, 'jpg');
  assert.strictEqual(result.picture[0].data.length, 196450);
  assert.strictEqual(result.picture[1].format, 'jpg');
  assert.strictEqual(result.picture[1].data.length, 196450);
});

//Aliased tests
parser.on('title', function(result) {
  assert.strictEqual(result, 'Voodoo People (Pendulum Remix)');
});

parser.on('artist', function(result) {
  assert.strictEqual(result[0], 'The Prodigy');
});

parser.on('albumartist', function(result) {
  assert.strictEqual(result[0], 'Pendulum');
});

parser.on('album', function(result) {
  assert.strictEqual(result, 'Voodoo People');
});

parser.on('year', function(result) {
  assert.strictEqual(result, '2005');
});

parser.on('track', function(result) {
  assert.strictEqual(result.no, 1);
  assert.strictEqual(result.of, 12);
});

parser.on('disk', function(result) {
  assert.strictEqual(result.no, 1);
  assert.strictEqual(result.of, 1);
});

parser.on('genre', function(result) {
  assert.strictEqual(result[0], 'Electronic');
});

parser.on('picture', function(result) {
  assert.strictEqual(result[0].format, 'jpg');
  assert.strictEqual(result[0].data.length, 196450);
  assert.strictEqual(result[1].format, 'jpg');
  assert.strictEqual(result[1].data.length, 196450);
});

parser.on('comment', function(result) {
  assert.strictEqual(result[0], '(Pendulum Remix)');
});

parser.on('composer', function(result) {
  assert.strictEqual(result[0], 'Liam Howlett');
});

//Raw tests
parser.on('trkn', function(result) {
  assert.strictEqual(result, '1/12');
});

parser.on('tmpo', function(result) {
  assert.strictEqual(result, 0);
});

parser.on('gnre', function(result) {
  assert.strictEqual(result, 'Electronic');
});

parser.on('stik', function(result) {
  assert.strictEqual(result, 256);
});

parser.on('©alb', function(result) {
  assert.strictEqual(result, 'Voodoo People');
});

parser.on('©ART', function(result) {
  assert.strictEqual(result, 'The Prodigy');
});

parser.on('aART', function(result) {
  assert.strictEqual(result, 'Pendulum');
});

parser.on('©cmt', function(result) {
  assert.strictEqual(result, '(Pendulum Remix)');
});

parser.on('©wrt', function(result) {
  assert.strictEqual(result, 'Liam Howlett');
});

parser.on('©nam', function(result) {
  assert.strictEqual(result, 'Voodoo People (Pendulum Remix)');
});

parser.on('©too', function(result) {
  assert.strictEqual(result, 'Lavf52.36.0');
});

parser.on('©day', function(result) {
  assert.strictEqual(result, '2005');
});

//raised twice (exact same content)
parser.on('covr', function(result) {
  assert.strictEqual(result.format, 'image/jpeg');
  assert.strictEqual(result.data.length, 196450);
});

parser.on('done', function(err) {
  if (err) throw err;
  assert.ok(true);
});