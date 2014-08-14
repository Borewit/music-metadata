var path   = require('path');
var mm     = require('..');
var fs     = require('fs');
var test   = require('prova');

test('ogg-multipage-metadata-bug', function (t) {
  t.plan(13);

  var sample = (process.browser) ?
    new Blob([fs.readFileSync(__dirname + '/samples/ogg-multipagemetadata-bug.ogg')])
    : fs.createReadStream(path.join(__dirname, '/samples/ogg-multipagemetadata-bug.ogg'))

  new mm(sample)
    .on('metadata', function (result) {
      t.strictEqual(result.title,
        'Modestep - To The Stars (Break the Noize & The Autobots Remix)', 'title');
      t.strictEqual(result.artist[0], 'Break The Noize & The Autobots', 'artist');
      t.strictEqual(result.albumartist[0], 'Modestep', 'albumartist');
      t.strictEqual(result.album, 'To The Stars', 'album');
      t.strictEqual(result.year, '2011-01-01', 'year');
      t.strictEqual(result.track.no, 2, 'track no');
      t.strictEqual(result.track.of, 5, 'track of');
      t.strictEqual(result.disk.no, 1, 'disk no');
      t.strictEqual(result.disk.of, 1, 'disk of');
      t.strictEqual(result.genre[0], 'Dubstep', 'genre');
      t.strictEqual(result.picture[0].format, 'jpg', 'picture format');
      t.strictEqual(result.picture[0].data.length, 207439, 'picture length');
    })
    .once('done', function (err) {
      t.error(err);
      t.end();
    });
});