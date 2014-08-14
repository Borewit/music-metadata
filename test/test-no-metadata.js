var path   = require('path');
var fs     = require('fs');
var id3    = require('..');
var test   = require('prova');

test('shouldn\'t raise metadata event for files that can\'t be parsed', function (t) {
  t.plan(1);

  var sample = (process.browser) ?
    new Blob([fs.readFileSync(__filename)])
    : fs.createReadStream(path.join(__filename))

  new id3(sample)
    .on('metadata', function (result) {
      t.notOk(true, 'this should never be hit');
    })
    .on('done', function (err) {
      t.equal(err.message, 'Could not find metadata header');
    })
});