var path   = require('path');
var fs     = require('fs');
var mm     = require('../lib');
var test   = require('tape');

test('regress-GH-18', function (t) {
  t.plan(7);
  var sample = path.join(__dirname, 'samples/flac-bug.flac');
    new mm(fs.createReadStream(sample))
      .on('metadata', function (result) {
        var picture = result.picture;
        delete result.picture;
        var expected = {
          title: 'Landform (Origin 2005)',
          artist: [ 'SOLAR FIELDS' ],
          albumartist: [ 'SOLAR FIELDS' ],
          album: '[ Origin # 02 ]',
          year: '2013',
          track: { no: 1, of: 0 },
          genre: [],
          disk: { no: 0, of: 0 }
        }
        t.deepEqual(result, expected, 'metadata');
        t.strictEqual(picture[0].format, 'jpg', 'picture format');
        t.strictEqual(picture[0].data.length, 207780, 'picture length')
        t.strictEqual(picture[0].data[0], 0xFF, 'raw data 0');
        t.strictEqual(picture[0].data[1], 0xD8, 'raw picture data 1');
        t.strictEqual(picture[0].data[picture[0].data.length - 1], 0xD9, 'raw picture data -1');
        t.strictEqual(picture[0].data[picture[0].data.length - 2], 0xFF, 'raw picture data -2');
    })
    .on('done', function (err) {
      if (err) throw err;
      t.end();
    })
})