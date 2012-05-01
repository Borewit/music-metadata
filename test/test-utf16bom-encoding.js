var id3 = require('../lib/index'),
    fs = require('fs'),
    testy = require('testy')(),
    assert = testy.assert;

testy.expected = 9;

var sample = require('path').join(__dirname, 'samples/bug-utf16bom-encoding.mp3');
var parser = new id3(fs.createReadStream(sample));

parser.on('metadata', function(result) {
  assert.strictEqual(result.title, 'It\'s All Over You Know');
  assert.strictEqual(result.artist[0], 'The Apers');
  assert.strictEqual(result.albumartist[0], 'The Apers');
  assert.strictEqual(result.album, 'Reanimate My Heart');
  assert.strictEqual(result.year, '2007');
  assert.strictEqual(result.track.no, 1);
  assert.strictEqual(result.track.of, 0);
  assert.strictEqual(result.genre[0], 'Punk Rock');
});

parser.on('done', function(err) {
  if (err) throw err;
  assert.ok(true);
});