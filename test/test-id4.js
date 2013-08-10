var path   = require('path');
var fs     = require('fs');
var id3    = require('../lib/index');
var test   = require('tap').test;

test('id4', function (t) {
  t.plan(46);

  var sample = path.join(__dirname, 'samples/id4.m4a');
  new id3(fs.createReadStream(sample))
    .on('metadata', function (result) {
      t.strictEqual(result.title, 'Voodoo People (Pendulum Remix)', 'title');
      t.strictEqual(result.artist[0], 'The Prodigy', 'artist');
      t.strictEqual(result.albumartist[0], 'Pendulum', 'albumartist');
      t.strictEqual(result.album, 'Voodoo People', 'album');
      t.strictEqual(result.year, '2005', 'year');
      t.strictEqual(result.track.no, 1, 'track no');
      t.strictEqual(result.track.of, 12, 'track of');
      t.strictEqual(result.disk.no, 1, 'disk no');
      t.strictEqual(result.disk.of, 1, 'disk of');
      t.strictEqual(result.genre[0], 'Electronic', 'genre');
      t.strictEqual(result.picture[0].format, 'jpg', 'picture 0 format');
      t.strictEqual(result.picture[0].data.length, 196450, 'picture 0 length');
      t.strictEqual(result.picture[1].format, 'jpg', 'picture 1 format');
      t.strictEqual(result.picture[1].data.length, 196450, 'picture 1 length');
    })
    // aliased tests
    .on('title', function (result) {
      t.strictEqual(result, 'Voodoo People (Pendulum Remix)', 'aliased title');
    })
    .on('artist', function (result) {
      t.strictEqual(result[0], 'The Prodigy', 'aliased artist');
    })
    .on('albumartist', function (result) {
      t.strictEqual(result[0], 'Pendulum', 'aliased albumartist');
    })
    .on('album', function (result) {
      t.strictEqual(result, 'Voodoo People', 'aliased album');
    })
    .on('year', function (result) {
      t.strictEqual(result, '2005', 'aliased year');
    })
    .on('track', function (result) {
      t.strictEqual(result.no, 1, 'aliased track no');
      t.strictEqual(result.of, 12, 'aliased track of');
    })
    .on('disk', function (result) {
      t.strictEqual(result.no, 1, 'aliased disk no');
      t.strictEqual(result.of, 1, 'aliased disk of');
    })
    .on('genre', function (result) {
      t.strictEqual(result[0], 'Electronic', 'aliased genre');
    })
    .on('picture', function (result) {
      t.strictEqual(result[0].format, 'jpg', 'aliased picture 0 format');
      t.strictEqual(result[0].data.length, 196450, 'aliased picture 0 length');
      t.strictEqual(result[1].format, 'jpg', 'aliased picture 1 format');
      t.strictEqual(result[1].data.length, 196450, 'aliased picture 1 length');
    })
    .on('comment', function (result) {
      t.strictEqual(result[0], '(Pendulum Remix)', 'aliased comment');
    })
    .on('composer', function (result) {
      t.strictEqual(result[0], 'Liam Howlett', 'aliased composer');
    })
    // raw tests
    .on('trkn', function (result) {
      t.strictEqual(result, '1/12', 'raw trkn');
    })
    .on('tmpo', function (result) {
      t.strictEqual(result, 0, 'raw tmpo');
    })
    .on('gnre', function (result) {
      t.strictEqual(result, 'Electronic', 'raw gnre');
    })
    .on('stik', function (result) {
      t.strictEqual(result, 256, 'raw stik');
    })
    .on('©alb', function (result) {
      t.strictEqual(result, 'Voodoo People', 'raw ©alb');
    })
    .on('©ART', function (result) {
      t.strictEqual(result, 'The Prodigy', 'raw ©ART');
    })
    .on('aART', function (result) {
      t.strictEqual(result, 'Pendulum', 'raw aART');
    })
    .on('©cmt', function (result) {
      t.strictEqual(result, '(Pendulum Remix)', 'raw ©cmt');
    })
    .on('©wrt', function (result) {
      t.strictEqual(result, 'Liam Howlett', 'raw ©wrt');
    })
    .on('©nam', function (result) {
      t.strictEqual(result, 'Voodoo People (Pendulum Remix)', 'raw ©nam');
    })
    .on('©too', function (result) {
      t.strictEqual(result, 'Lavf52.36.0', 'raw ©too');
    })
    .on('©day', function (result) {
      t.strictEqual(result, '2005', 'raw ©day');
    })
    //raised twice (exact same content)
    .on('covr', function (result) {
      t.strictEqual(result.format, 'image/jpeg', 'raw covr format (asserted twice)');
      t.strictEqual(result.data.length, 196450, 'raw covr length (asserted twice)');
    })
    .on('done', function (err) {
      if (err) throw err;
    });
});
