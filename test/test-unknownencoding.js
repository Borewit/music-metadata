var fs = require('fs'),
    mm = require('../lib/index'),
    assert = require('assert'),
    testHelper = require('./testHelper');
    
var sample = require('path').join(__dirname, 'samples/bug-unkown encoding.mp3');
var parser = new mm(fs.createReadStream(sample));

var testHelper = new testHelper(10, __filename);

parser.on('metadata', function(result) {
  assert.strictEqual(result.title, '808');
  assert.deepEqual(result.artist, ['Benga']);
  assert.deepEqual(result.albumartist, ['Benga']);
  assert.strictEqual(result.album, 'Phaze One');
  assert.strictEqual(result.year, 2010);
  assert.strictEqual(result.track.no, 4);
  assert.strictEqual(result.track.of, 8);
  assert.deepEqual(result.genre, ['Dubstep']);
  assert.strictEqual(result.picture.format, 'jpg');
  assert.strictEqual(result.picture.data.length, 6761);
  testHelper.ranTests(10);
});