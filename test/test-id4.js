var id3 = require('../lib/index'),
    fs = require('fs'),
    assert = require('assert'),
    testsRan = 0;
        
var sample = require('path').join(__dirname, 'samples/id4.m4a');
var parser = new id3(fs.createReadStream(sample));

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
  testsRan += 10;
});

parser.on('title', function(result) {
  assert.strictEqual(result, 'Voodoo People (Pendulum Remix)');
  testsRan++;
});

parser.on('artist', function(result) {
  assert.strictEqual(result, 'The Prodigy');
  testsRan++;
});

parser.on('albumartist', function(result) {
  assert.strictEqual(result, 'Pendulum');
  testsRan++;
});

parser.on('album', function(result) {
  assert.strictEqual(result, 'Voodoo People');
  testsRan++;
});

parser.on('year', function(result) {
  assert.strictEqual(result, '2005');
  testsRan++;
});

parser.on('track', function(result) {
  assert.strictEqual(result, '1/0');
  testsRan++;
});

parser.on('disk', function(result) {
  assert.strictEqual(result, '1/1');
  testsRan++;
});

parser.on('genre', function(result) {
  assert.strictEqual(result, 'Electronic');
  testsRan++;
});

parser.on('trkn', function(result) {
  assert.strictEqual(result, '1/0');
  testsRan++;
});

parser.on('tmpo', function(result) {
  assert.strictEqual(result, 0);
  testsRan++;
});

parser.on('gnre', function(result) {
  assert.strictEqual(result, 'Electronic');
  testsRan++;
});

parser.on('stik', function(result) {
  assert.strictEqual(result, 256);
  testsRan++;
});

parser.on('©alb', function(result) {
  assert.strictEqual(result, 'Voodoo People');
  testsRan++;
});

parser.on('©ART', function(result) {
  assert.strictEqual(result, 'The Prodigy');
  testsRan++;
});

parser.on('aART', function(result) {
  assert.strictEqual(result, 'Pendulum');
  testsRan++;
});

parser.on('©cmt', function(result) {
  assert.strictEqual(result, '(Pendulum Remix)');
  testsRan++;
});

parser.on('©wrt', function(result) {
  assert.strictEqual(result, 'Liam Howlett');
  testsRan++;
});

parser.on('©nam', function(result) {
  assert.strictEqual(result, 'Voodoo People (Pendulum Remix)');
  testsRan++;
});

parser.on('©too', function(result) {
  assert.strictEqual(result, 'Lavf52.36.0');
  testsRan++;
});

parser.on('©day', function(result) {
  assert.strictEqual(result, '2005');
  testsRan++;
});

parser.on('covr', function(result) {
  assert.strictEqual(result.format, 'image/jpeg');
  assert.strictEqual(result.data.length, 196450);
  testsRan += 2;
});

parser.on('done', function() {
  assert.equal(testsRan, 32);
  console.log(__filename + ' ran ' + testsRan + ' tests');
});