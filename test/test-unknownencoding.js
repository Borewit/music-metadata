var fs = require('fs'),
    mm = require('../lib/index'),
    testy = require('testy')(),
    assert = testy.assert;
    
testy.expected = 10;

var sample = require('path').join(__dirname, 'samples/bug-unkown encoding.mp3');
var parser = new mm(fs.createReadStream(sample));

parser.on('metadata', function(result) {
  assert.strictEqual(result.title, '808');
  assert.strictEqual(result.artist[0], 'Benga');
  assert.strictEqual(result.albumartist[0], 'Benga');
  assert.strictEqual(result.album, 'Phaze One');
  assert.strictEqual(result.year, '2010');
  assert.strictEqual(result.track.no, 4);
  assert.strictEqual(result.track.of, 8);
  assert.strictEqual(result.genre[0], 'Dubstep');
  assert.strictEqual(result.picture[0].format, 'jpg');
  assert.strictEqual(result.picture[0].data.length, 6761);
});