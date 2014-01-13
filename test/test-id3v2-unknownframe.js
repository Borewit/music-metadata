var path   = require('path');
var fs     = require('fs');
var Mmd    = require('../');
var test   = require('tape');

test('invalid "Date" frame should not cause crash', function(t) {
  t.plan(7);
  var sample = path.join(__dirname, 'samples/bug-id3v2-unknownframe.mp3');
  new Mmd(fs.createReadStream(sample))
    .on('metadata', function (result) {
      t.strictEqual(result.title, 'One', 'title');
      t.strictEqual(result.artist[0], 'Coheed And Cambria', 'artist');
      t.strictEqual(result.album, 'Year Of The Black Rainbow', 'album');
      t.strictEqual(result.year, '2010', 'year');
      t.strictEqual(result.track.no, 1, 'track no');
      t.strictEqual(result.genre[0], 'Progressive Rock', 'genre');
    })
    .on('done', function(err) {
      t.ok(err == null);
    })
});
