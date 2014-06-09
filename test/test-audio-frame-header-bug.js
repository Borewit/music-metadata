var path   = require('path');
var stream = require('stream');
var mm     = require('..');
var fs     = require('fs');
var test   = require('prova');

test('audio-frame-header-bug', function (t) {
  t.plan(1);
  var sample = path.join(__dirname, 'samples/audio-frame-header-bug.mp3');
  var readStream = fs.createReadStream(sample);
  new mm(readStream, { duration: true })
    .on('metadata', function (result) {
      t.strictEqual(result.duration, 202);
      t.end();
    })
});
