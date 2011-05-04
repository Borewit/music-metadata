var id3 = require('../lib/index'),
    fs = require('fs'),
    assert = require('assert'),
    testHelper = require('./testHelper');
    
var sample = require('path').join(__dirname, 'samples/id3v2.3.mp3');
var parser = new id3(fs.createReadStream(sample));

var testHelper = new testHelper(38, __filename);

parser.on('metadata', function(result) {
  assert.strictEqual(result.title, 'Home');
  assert.deepEqual(result.artist, ['Explosions In The Sky', 'Another', 'And Another']);
  assert.deepEqual(result.albumartist, ['Soundtrack']);
  assert.strictEqual(result.album, 'Friday Night Lights [Original Movie Soundtrack]');
  assert.strictEqual(result.year, 2004);
  assert.strictEqual(result.track[0], 5);
  assert.strictEqual(result.track[1], 0);
  assert.strictEqual(result.disk[0], 1);
  assert.strictEqual(result.disk[1], 1);
  assert.deepEqual(result.genre, ['Soundtrack']);
  assert.strictEqual(result.picture.format, 'jpg');
  assert.strictEqual(result.picture.data.length, 80938);
  testHelper.ranTests(12);
});

parser.on('title', function(result) {
  assert.strictEqual(result, 'Home');
  testHelper.ranTests(1)
});

parser.on('artist', function(result) {
  assert.strictEqual(result, 'Explosions In The Sky/Another/And Another');
  testHelper.ranTests(1)
});

parser.on('albumartist', function(result) {
  assert.strictEqual(result, 'Soundtrack');
  testHelper.ranTests(1)
});

parser.on('album', function(result) {
  assert.strictEqual(result, 'Friday Night Lights [Original Movie Soundtrack]');
  testHelper.ranTests(1)
});

parser.on('year', function(result) {
  assert.strictEqual(result, '2004');
  testHelper.ranTests(1)
});

parser.on('track', function(result) {
  assert.strictEqual(result, '5');
  testHelper.ranTests(1);
});

parser.on('disk', function(result) {
  assert.strictEqual(result, '1/1');
  testHelper.ranTests(1);
});

parser.on('genre', function(result) {
  assert.strictEqual(result, 'Soundtrack');
  testHelper.ranTests(1)
});

parser.on('picture', function(result) {
  assert.strictEqual(result.format, 'image/jpg');
  assert.strictEqual(result.type, 'Cover (front)');
  assert.strictEqual(result.description, '');
  assert.strictEqual(result.data.length, 80938);
  testHelper.ranTests(4);
});

parser.on('TALB', function(result) {
  assert.strictEqual(result, 'Friday Night Lights [Original Movie Soundtrack]');
  testHelper.ranTests(1);
});

parser.on('TPE1', function(result) {
  assert.strictEqual(result, 'Explosions In The Sky/Another/And Another');
  testHelper.ranTests(1);
});

parser.on('TPE2', function(result) {
  assert.strictEqual(result, 'Soundtrack');
  testHelper.ranTests(1);
});

parser.on('TCOM', function(result) {
  assert.strictEqual(result, 'Explosions in the Sky');
  testHelper.ranTests(1);
});

parser.on('TPOS', function(result) {
  assert.strictEqual(result, '1/1');
  testHelper.ranTests(1);
});

parser.on('TCON', function(result) {
  assert.strictEqual(result, 'Soundtrack');
  testHelper.ranTests(1);
});

parser.on('TIT2', function(result) {
  assert.strictEqual(result, 'Home');
  testHelper.ranTests(1);
});

parser.on('TRCK', function(result) {
  assert.strictEqual(result, '5');
  testHelper.ranTests(1);
});

parser.on('TYER', function(result) {
  assert.strictEqual(result, '2004');
  testHelper.ranTests(1);
});

parser.on('APIC', function(result) {
  assert.strictEqual(result.format, 'image/jpg');
  assert.strictEqual(result.type, 'Cover (front)');
  assert.strictEqual(result.description, '');
  assert.strictEqual(result.data.length, 80938);
  testHelper.ranTests(4);
});

parser.on('done', function(err) {
  if (err) throw err;
  testHelper.ranTests(1);
});