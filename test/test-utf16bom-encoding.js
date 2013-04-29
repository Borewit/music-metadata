var id3    = require('../lib/index');
var fs     = require('fs');
var test   = require('tap').test;

test('should read utf16bom encoded metadata correctly', function (t) {
  t.plan(8);

  var sample = require('path').join(__dirname, 'samples/bug-utf16bom-encoding.mp3');
  new id3(fs.createReadStream(sample))
    .on('metadata', function (result) {
      t.equal(result.title, 'It\'s All Over You Know', 'title');
      t.equal(result.artist[0], 'The Apers', 'artist');
      t.equal(result.albumartist[0], 'The Apers', 'albumartist');
      t.equal(result.album, 'Reanimate My Heart', 'album');
      t.equal(result.year, '2007', 'year');
      t.equal(result.track.no, 1, 'track no');
      t.equal(result.track.of, 0, 'track of');
      t.equal(result.genre[0], 'Punk Rock', 'genre');
    })
    .on('done', function (err) {
      if (err) throw err;
      t.end();
    });

});



