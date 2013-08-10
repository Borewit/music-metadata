var path   = require('path');
var fs     = require('fs');
var mm     = require('../lib/index');
var test   = require('tap').test;


test('no events m4a', function(t) {
  t.plan(1);
  var sample = path.join(__dirname, 'samples/bug-no-events.m4a');
  new mm(fs.createReadStream(sample))
    .on('metadata', function(result) {
      t.notOk(true, 'this should never be hit');
    })
    .on('done', function(err) {
      t.equal(err.message, "Unexpected end of stream");
    })
});
