var path   = require('path');
var mm     = require('../lib/index');
var fs     = require('fs');
var test   = require('tap').test;

  var sample = path.join(__dirname, 'samples/ogg-multipagemetadata-bug.ogg');
  var stream = fs.createReadStream(sample);
  new mm(stream)
    .on('metadata', function (result) {
      console.log(result);
      // assert.strictEqual(result.title, 'Modestep - To The Stars (Break the Noize & The Autobots Remix)');
      // assert.strictEqual(result.artist[0], 'Break The Noize & The Autobots');
      // assert.strictEqual(result.albumartist[0], 'Modestep');
      // assert.strictEqual(result.album, 'To The Stars');
      // assert.strictEqual(result.year, '2011-01-01');
      // assert.strictEqual(result.track.no, 2);
      // assert.strictEqual(result.track.of, 5);
      // assert.strictEqual(result.disk.no, 1);
      // assert.strictEqual(result.disk.of, 1);
      // assert.strictEqual(result.genre[0], 'Dubstep');
      // assert.strictEqual(result.picture[0].format, 'jpg');
      // assert.strictEqual(result.picture[0].data.length, 207439);
    })
    .on('done', function (err) {
      console.log('in done');
      if (err) throw err;
      t.end();
    });

// test('ogg-multipage-metadata-bug', function (t) {
//   t.plan(12);


// });