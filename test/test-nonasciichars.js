var path   = require('path');
var fs     = require('fs');
var mm     = require('../lib/index');
var test   = require('prova');

test('nonasciichars', function (t) {
  t.plan(1);
  var sample = path.join(__dirname, 'samples/bug-non ascii chars.mp3');
  new mm(fs.createReadStream(sample))
    .on('metadata', function (result) {
      t.strictEqual(result.artist[0], 'Janelle Monáe', 'artist');
      t.end();
    });
});