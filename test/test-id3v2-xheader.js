var path   = require('path');
var fs     = require('fs');
var mm     = require('../lib');
var test   = require('tap').test;

test('should be able to read id3v2 files with extended headers', function (t) {
  t.plan(1);
  var sample = path.join(__dirname, 'samples/id3v2-xheader.mp3');
    new mm(fs.createReadStream(sample))
      .on('metadata', function (result) {
        var expected = {
          title: 'title',
          artist: [],
          albumartist: [],
          album: '',
          year: 0,
          track: { no: 0, of: 0 },
          genre: [],
          disk: { no: 0, of: 0 },
          picture: {}
        }
        t.deepEqual(result, expected, 'metadata');
    })
    .on('done', function (err) {
      if (err) throw err;
      t.end();
    })
})