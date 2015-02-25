var path   = require('path');
var stream = require('stream');
var mm     = require('..');
var fs     = require('fs');
var test   = require('prova');

test('audio-frame-header-bug', function (t) {
  t.plan(1);

  var sample = (process.browser) ?
    new Blob([fs.readFileSync(__dirname + '/samples/audio-frame-header-bug.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/audio-frame-header-bug.mp3'))

  new mm(sample, { duration: true }, function (err, result) {
      t.strictEqual(result.duration, 201);
      t.end();
    })
});
