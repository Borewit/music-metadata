var id3 = require('../lib/index'),
    fs = require('fs'),
    assert = require('assert'),
    testsRan = 0;

var sample = require('path').join(__dirname, 'samples/id3v1.mp3');
var parser = new id3(fs.createReadStream(sample));

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
  testsRan += 8;
});

parser.on('title', function(result) {
  assert.strictEqual(result, 'Blood Sugar');
  testsRan++;
});

parser.on('artist', function(result) {
  assert.strictEqual(result, 'Pendulum');
  testsRan++;
});

parser.on('album', function(result) {
  assert.strictEqual(result, 'Blood Sugar (Single)');
  testsRan++;
});

parser.on('year', function(result) {
  assert.strictEqual(result, '2007');
  testsRan++;
});

parser.on('track', function(result) {
  assert.strictEqual(result, 1);
  testsRan++;
});

parser.on('genre', function(result) {
  assert.deepEqual(result, 'Electronic');
  testsRan++;
});

parser.on('comment', function(result) {
  assert.strictEqual(result, 'abcdefg');
  testsRan++;
});

parser.on('done', function(result) {
  assert.equal(testsRan, 15);
  console.log(__filename + ' ran ' + testsRan + ' tests');
});