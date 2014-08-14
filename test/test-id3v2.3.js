var path   = require('path');
var id3    = require('..');
var fs     = require('fs');
var test   = require('prova');

test('id3v2.3', function (t) {
  t.plan(43);

  var sample = (process.browser) ?
    new Blob([fs.readFileSync(__dirname + '/samples/id3v2.3.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/id3v2.3.mp3'))

  new id3(sample, {duration : true})
    .on('metadata', function (result) {
      t.strictEqual(result.title, 'Home', 'title');
      t.strictEqual(result.artist[0], 'Explosions In The Sky', 'artist 0');
      t.strictEqual(result.artist[1], 'Another', 'artist 1');
      t.strictEqual(result.artist[2], 'And Another', 'artist 2');
      t.strictEqual(result.albumartist[0], 'Soundtrack', 'albumartist');
      t.strictEqual(result.album, 'Friday Night Lights [Original Movie Soundtrack]', 'album');
      t.strictEqual(result.year, '2004', 'year');
      t.strictEqual(result.track.no, 5, 'track no');
      t.strictEqual(result.track.of, 0, 'track of');
      t.strictEqual(result.disk.no, 1, 'disk no');
      t.strictEqual(result.disk.of, 1, 'disk of');
      t.strictEqual(result.genre[0], 'Soundtrack', 'genre');
      t.strictEqual(result.picture[0].format, 'jpg', 'picture format');
      t.strictEqual(result.picture[0].data.length, 80938, 'picture length');
      t.strictEqual(result.duration, 1, 'metadata duration');
    })
    .on('duration', function (result) {
      t.strictEqual(result, 1, 'duration');
    })
    // aliased tests
    .on('title', function (result) {
      t.strictEqual(result, 'Home', 'aliased title');
    })
    .on('artist', function (result) {
      t.strictEqual(result[0], 'Explosions In The Sky', 'aliased artist 0');
      t.strictEqual(result[1], 'Another', 'aliased artist 1');
      t.strictEqual(result[2], 'And Another', 'aliased artist 2');
    })
    .on('albumartist', function (result) {
      t.strictEqual(result[0], 'Soundtrack', 'aliased albumartist');
    })
    .on('album', function (result) {
      t.strictEqual(result, 'Friday Night Lights [Original Movie Soundtrack]', 'aliased album');
    })
    .on('year', function (result) {
      t.strictEqual(result, '2004', 'aliased year');
    })
    .on('track', function (result) {
      t.strictEqual(result.no, 5, 'aliased track no');
      t.strictEqual(result.of, 0, 'aliased track of');
    })
    .on('disk', function (result) {
      t.strictEqual(result.no, 1, 'aliased disk no');
      t.strictEqual(result.of, 1, 'aliased disk of');
    })
    .on('genre', function (result) {
      t.strictEqual(result[0], 'Soundtrack', 'aliased genre');
    })
    .on('picture', function (result) {
      t.strictEqual(result[0].format, 'jpg', 'aliased picture format');
      t.strictEqual(result[0].data.length, 80938, 'aliased picture length');
    })
    // raw tests
    .on('TALB', function (result) {
      t.strictEqual(result, 'Friday Night Lights [Original Movie Soundtrack]', 'raw TALB');
    })
    .on('TPE1', function (result) {
      t.strictEqual(result, 'Explosions In The Sky/Another/And Another', 'raw TPE1');
    })
    .on('TPE2', function (result) {
      t.strictEqual(result, 'Soundtrack', 'raw TPE2');
    })
    .on('TCOM', function (result) {
      t.strictEqual(result, 'Explosions in the Sky', 'raw TCOM');
    })
    .on('TPOS', function (result) {
      t.strictEqual(result, '1/1', 'raw TPOS');
    })
    .on('TCON', function (result) {
      t.strictEqual(result, 'Soundtrack', 'raw TCON');
    })
    .on('TIT2', function (result) {
      t.strictEqual(result, 'Home', 'raw TIT2');
    })
    .on('TRCK', function (result) {
      t.strictEqual(result, '5', 'raw TRCK');
    })
    .on('TYER', function (result) {
      t.strictEqual(result, '2004', 'raw TYER');
    })
    .on('APIC', function (result) {
      t.strictEqual(result.format, 'image/jpg', 'raw APIC format');
      t.strictEqual(result.type, 'Cover (front)', 'raw APIC type');
      t.strictEqual(result.description, '', 'raw APIC description');
      t.strictEqual(result.data.length, 80938, 'raw APIC length');
    })
    .on('done', function (err) {
      if (err) throw err;
      t.end();
    });
});