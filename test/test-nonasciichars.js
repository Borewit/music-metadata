var path   = require('path');
var fs     = require('fs');
var mm     = require('..');
var test   = require('prova');

test('nonasciichars', function (t) {
  t.plan(1);

  var sample = (process.browser) ?
    new Blob([fs.readFileSync(__dirname + '/samples/bug-non ascii chars.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/bug-non ascii chars.mp3'))

  new mm(sample)
    .on('metadata', function (result) {
      t.strictEqual(result.artist[0], 'Janelle Monáe', 'artist');
      t.end();
    });
});