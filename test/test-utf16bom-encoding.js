var id3    = require('..');
var fs     = require('fs');
var path   = require('path');
var test   = require('prova');

test('should read utf16bom encoded metadata correctly', function (t) {
  t.plan(9);

  var sample = (process.browser) ?
    new Blob([fs.readFileSync(__dirname + '/samples/bug-utf16bom-encoding.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/bug-utf16bom-encoding.mp3'))

  new id3(sample)
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
      t.error(err);
      t.end();
    });

});



