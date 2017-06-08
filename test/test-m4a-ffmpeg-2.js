var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test('error handling', function (t) {
  t.plan(0)

  var filename = 'Simpsons04x01.m4a';
  var filePath = path.join(__dirname, 'samples', filename);

  mm.parseFile(filePath).then(function (result) {
    // ToDo: only relevant for content based type determination
    t.end()
  }).catch(function (err) {
    t.error(err, 'no error')
  });
})
