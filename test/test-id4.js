var id3 = require('../lib/index'),
    fs = require('fs'),
    assert = require('assert'),
    testHelper = require('./testHelper');
        
var sample = require('path').join(__dirname, 'samples/id4.m4a');
var parser = new id3(fs.createReadStream(sample));

var testHelper = new testHelper(37, __filename);

parser.on('metadata', function(result) {
  assert.strictEqual(result.title, 'Voodoo People (Pendulum Remix)');
  assert.deepEqual(result.artist, ['The Prodigy']);
  assert.deepEqual(result.albumartist, ['Pendulum']);
  assert.strictEqual(result.album, 'Voodoo People');
  assert.strictEqual(result.year, 2005);
  assert.strictEqual(result.track[0], 1);
  assert.strictEqual(result.track[1], 0);
  assert.strictEqual(result.disk[0], 1);
  assert.strictEqual(result.disk[1], 1);
  assert.deepEqual(result.genre, ['Electronic']);
  assert.strictEqual(result.picture.format, 'jpg');
  assert.strictEqual(result.picture.data.length, 196450);
  testHelper.ranTests(12);
});

parser.on('title', function(result) {
  assert.strictEqual(result, 'Voodoo People (Pendulum Remix)');
  testHelper.ranTests(1);
});

parser.on('artist', function(result) {
  assert.strictEqual(result, 'The Prodigy');
  testHelper.ranTests(1);
});

parser.on('albumartist', function(result) {
  assert.strictEqual(result, 'Pendulum');
  testHelper.ranTests(1);
});

parser.on('album', function(result) {
  assert.strictEqual(result, 'Voodoo People');
  testHelper.ranTests(1);
});

parser.on('year', function(result) {
  assert.strictEqual(result, '2005');
  testHelper.ranTests(1);
});

parser.on('track', function(result) {
  assert.strictEqual(result, '1/0');
  testHelper.ranTests(1);
});

parser.on('disk', function(result) {
  assert.strictEqual(result, '1/1');
  testHelper.ranTests(1);
});

parser.on('genre', function(result) {
  assert.strictEqual(result, 'Electronic');
  testHelper.ranTests(1);
});

parser.on('picture', function(result) {
  assert.strictEqual(result.format, 'image/jpeg');
  assert.strictEqual(result.data.length, 196450);
  testHelper.ranTests(2);
});

parser.on('trkn', function(result) {
  assert.strictEqual(result, '1/0');
  testHelper.ranTests(1);
});

parser.on('tmpo', function(result) {
  assert.strictEqual(result, 0);
  testHelper.ranTests(1);
});

parser.on('gnre', function(result) {
  assert.strictEqual(result, 'Electronic');
  testHelper.ranTests(1);
});

parser.on('stik', function(result) {
  assert.strictEqual(result, 256);
  testHelper.ranTests(1);
});

parser.on('©alb', function(result) {
  assert.strictEqual(result, 'Voodoo People');
  testHelper.ranTests(1);
});

parser.on('©ART', function(result) {
  assert.strictEqual(result, 'The Prodigy');
  testHelper.ranTests(1);
});

parser.on('aART', function(result) {
  assert.strictEqual(result, 'Pendulum');
  testHelper.ranTests(1);
});

parser.on('©cmt', function(result) {
  assert.strictEqual(result, '(Pendulum Remix)');
  testHelper.ranTests(1);
});

parser.on('©wrt', function(result) {
  assert.strictEqual(result, 'Liam Howlett');
  testHelper.ranTests(1);
});

parser.on('©nam', function(result) {
  assert.strictEqual(result, 'Voodoo People (Pendulum Remix)');
  testHelper.ranTests(1);
});

parser.on('©too', function(result) {
  assert.strictEqual(result, 'Lavf52.36.0');
  testHelper.ranTests(1);
});

parser.on('©day', function(result) {
  assert.strictEqual(result, '2005');
  testHelper.ranTests(1);
});

parser.on('covr', function(result) {
  assert.strictEqual(result.format, 'image/jpeg');
  assert.strictEqual(result.data.length, 196450);
  testHelper.ranTests(2);
});

parser.on('done', function() {
  testHelper.ranTests(1);
});