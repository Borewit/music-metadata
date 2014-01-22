var path   = require('path');
var fs     = require('fs');
var id3    = require('../lib/index');
var test   = require('tape');

test('id3v2-duration-allframes', function (t) {
  t.plan(3);

  var sample = path.join(__dirname, 'samples/id3v2-duration-allframes.mp3');
  new id3(fs.createReadStream(sample), {'duration': true})
    .on('metadata', function (result) {
      t.deepEqual(result,
        { title: 'Turkish Rondo',
          artist: [ 'Aubrey Hilliard' ],
          albumartist: [],
          album: 'Piano Classics',
          year: '0',
          track: { no: 1, of: 0 },
          genre: [ 'Classical' ],
          disk: { no: 0, of: 0 },
          picture: {},
          duration: 1 })
    })
    .on('duration', function (result) {
      t.strictEqual(result, 1, 'duration');
    })
    .on('done', function (err) {
      if (err) throw err;
      t.ok(true, 'done called');
    });
})