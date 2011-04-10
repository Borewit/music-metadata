var id3 = require('../lib/index'),
    fs = require('fs'),
    assert = require('assert'),
    testsRan = 0;
      
var parser = new id3(fs.createReadStream('samples/id3v1.mp3'));

parser.on('metadata', function(result) {
  assert.equal(result.title, 'Blood Sugar');
  assert.equal(result.artist, 'Pendulum');
  assert.equal(result.album, 'Blood Sugar (Single)');
  assert.equal(result.year, 2007);
  assert.equal(result.track, 1);
  assert.equal(result.genre, 'Electronic');
  testsRan += 6;
});

parser.on('title', function(result) {
  assert.equal(result, 'Blood Sugar');
  testsRan++;
});

parser.on('artist', function(result) {
  assert.equal(result, 'Pendulum');
  testsRan++;
});

parser.on('album', function(result) {
  assert.equal(result, 'Blood Sugar (Single)');
  testsRan++;
});

parser.on('year', function(result) {
  assert.equal(result,'2007');
  testsRan++;
});

parser.on('comment', function(result) {
  assert.equal(result, 'abcdefg');
  testsRan++;
});

parser.on('track', function(result) {
  assert.equal(result, 1);
  testsRan++;
});

parser.on('genre', function(result) {
  assert.equal(result,'Electronic');
  testsRan++;
});

parser.on('done', function(result) {
  assert.equal(testsRan, 13);
  console.log(__filename + ' ran ' + testsRan + ' tests');
});