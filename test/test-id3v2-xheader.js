var path   = require('path');
var fs     = require('fs');
var mm     = require('../lib');
var test   = require('tape');

test('should be able to read id3v2 files with extended headers', function (t) {
  t.plan(2);
  var sample = path.join(__dirname, 'samples/id3v2-xheader.mp3');
  new mm(fs.createReadStream(sample))
    .on('metadata', function (result) {
      var expected = {
        title: 'title',
        artist: [],
        albumartist: [],
        album: '',
        year: "",
        track: { no: 0, of: 0 },
        genre: [],
        disk: { no: 0, of: 0 },
        picture: {},
        duration: 0
      }
      // additional check because deepEqual is not strict
      t.strictEqual(result.year, expected.year, "year");
      t.deepEqual(result, expected, 'metadata');
    })
    .on('done', function (err) {
      if (err) throw err;
      t.end();
    })
})
