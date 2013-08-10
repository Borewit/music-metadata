var path   = require('path');
var fs     = require('fs');
var id3    = require('../lib/index');
var test   = require('tap').test;

test('shouldn\'t raise metadata event for files that can\'t be parsed', function (t) {
  new id3(fs.createReadStream(__filename))
    .on('metadata', function (result) {
      t.notOk(true, 'this should never be hit');
    })
    .on('done', function (err) {
      t.end();
    });
});