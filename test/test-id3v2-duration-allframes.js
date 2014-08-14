var path   = require('path');
var fs     = require('fs');
var id3    = require('..');
var test   = require('prova');

test('id3v2-duration-allframes', function (t) {
  t.plan(4);

  var sample = (process.browser) ?
    new Blob([fs.readFileSync(__dirname + '/samples/id3v2-duration-allframes.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/id3v2-duration-allframes.mp3'))

  new id3(sample, {'duration': true})
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
      t.error(err)
      t.ok(true, 'done called');
    });
})