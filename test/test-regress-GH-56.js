var path = require('path');
var fs = require('fs');
var id3 = require('../lib');
var test = require('prova');

test('mp3 cbr calculation', function (t) {
  t.plan(1);
  var sample = path.join(__dirname, 'samples/regress-GH-56.mp3');
  new id3(fs.createReadStream(sample), {'duration': true})
    .on('metadata', function (result) {
      t.strictEqual(result.duration, 373, 'duration');
    })
    .on('done', function (err) {
      if (err) throw err;
    });
});