var path   = require('path');
var mm     = require('../lib/index');
var fs     = require('fs');
var test   = require('tape');

test('ogg', function (t) {
  t.plan(48);
  var comCounter = 0;
  var genCounter = 0;
  var sample = path.join(__dirname, 'samples/oggy.ogg');
  mm(fs.createReadStream(sample), { duration: true })
    .on('metadata', function (result) {
      t.strictEqual(result.title, 'In Bloom', 'title');
      t.strictEqual(result.artist[0], 'Nirvana', 'artist');
      t.strictEqual(result.albumartist[0], 'Nirvana', 'albumartist');
      t.strictEqual(result.album, 'Nevermind', 'album');
      t.strictEqual(result.year, '1991', 'year');
      t.strictEqual(result.track.no, 1, 'track no');
      t.strictEqual(result.track.of, 12, 'track of');
      t.strictEqual(result.disk.no, 1, 'disk no');
      t.strictEqual(result.disk.of, 0, 'disk of');
      t.strictEqual(result.genre[0], 'Grunge', 'genre 0');
      t.strictEqual(result.genre[1], 'Alternative', 'genre 1');
      t.strictEqual(result.picture[0].format, 'jpg', 'picture format');
      t.strictEqual(result.picture[0].data.length, 30966, 'picture length');
      t.strictEqual(result.duration, 0, 'metadata duration');
    })
    .on('duration', function (result) {
      t.strictEqual(result, 0, 'duration');
    })
    // aliased tests
    .on('title', function (result) {
      t.strictEqual(result, 'In Bloom', 'aliased title');
    })
    .on('artist', function (result) {
      t.strictEqual(result[0], 'Nirvana', 'aliased artist');
    })
    .on('albumartist', function (result) {
      t.strictEqual(result[0], 'Nirvana', 'aliased albumartist');
    })
    .on('album', function (result) {
      t.strictEqual(result, 'Nevermind', 'aliased album');
    })
    .on('year', function (result) {
      t.strictEqual(result, '1991', 'aliased year');
    })
    .on('track', function (result) {
      t.strictEqual(result.no, 1, 'aliased track no');
      t.strictEqual(result.of, 12, 'aliased track of');
    })
    .on('disk', function (result) {
      t.strictEqual(result.no, 1, 'aliased disk no');
      t.strictEqual(result.of, 0, 'aliased disk of');
    })
    .on('genre', function (result) {
      t.strictEqual(result[0], 'Grunge', 'aliased genre 0');
      t.strictEqual(result[1], 'Alternative', 'aliased genre 1');
    })
    .on('picture', function (result) {
      t.strictEqual(result[0].format, 'jpg', 'aliased picture format');
      t.strictEqual(result[0].data.length, 30966, 'aliased picture length');
    })
    // raw tests
    .on('TRACKTOTAL', function (result) {
      t.strictEqual(result, '12', 'raw TRACKTOTAL');
    })
    .on('ALBUM', function (result) {
      t.strictEqual(result, 'Nevermind', 'raw ALBUM');
    })
    .on('ARTIST', function (result) {
      t.strictEqual(result, 'Nirvana', 'raw ARTIST');
    })
    .on('COMMENT', function (result) {
      switch(comCounter) {
        case 0:
          t.strictEqual(result, 'Nirvana\'s Greatest Album', 'raw COMMENT 0');
          break;
        case 1:
          t.strictEqual(result, 'And their greatest song', 'raw COMMENT 1');
          break;
      }
      comCounter++;
    })
    .on('GENRE', function (result) {
      switch(genCounter) {
        case 0:
          t.strictEqual(result, 'Grunge', 'raw GENRE 0');
          break;
        case 1:
          t.strictEqual(result, 'Alternative', 'raw GENRE 1');
          break;
      }
      genCounter++;
    })
    .on('TITLE', function (result) {
      t.strictEqual(result, 'In Bloom', 'raw TITLE');
    })
    .on('ALBUMARTIST', function (result) {
      t.strictEqual(result, 'Nirvana', 'raw ALBUMARTIST');
    })
    .on('DISCNUMBER', function (result) {
      t.strictEqual(result, '1', 'raw DISCNUMBER');
    })
    .on('DATE', function (result) {
      t.strictEqual(result, '1991', 'raw DATE');
    })
    .on('TRACKNUMBER', function (result) {
      t.strictEqual(result, '1', 'raw TRACKNUMBER');
    })
    .on('METADATA_BLOCK_PICTURE', function (result) {
      t.strictEqual(result.format, 'image/jpeg', 'raw METADATA_BLOCK_PICTURE format');
      t.strictEqual(result.type, 'Cover (back)', 'raw METADATA_BLOCK_PICTURE type');
      t.strictEqual(result.description, 'little willy', 'raw METADATA_BLOCK_PICTURE description');
      // test exact contents too
      t.strictEqual(result.data.length, 30966, 'raw METADATA_BLOCK_PICTURE length');
      t.strictEqual(result.data[0], 255, 'raw METADATA_BLOCK_PICTURE data 0');
      t.strictEqual(result.data[1], 216, 'raw METADATA_BLOCK_PICTURE data 1');
      t.strictEqual(result.data[result.data.length - 1], 217, 'raw METADATA_BLOCK_PICTURE data -1');
      t.strictEqual(result.data[result.data.length - 2], 255, 'raw METADATA_BLOCK_PICTURE data -2');
    })
    .on('done', function (err) {
      if (err) throw err;
      t.end();
    })
});