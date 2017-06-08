var path = require('path')
var mm = require('..')
var fs = require('fs')
var test = require('tape')

test('audio-frame-header-bug', function (t) {
  t.plan(1)

  var filePath = path.join(__dirname, 'samples', 'audio-frame-header-bug.mp3');

  mm.parseFile(filePath, { duration: true }).then(function (result) {
    t.strictEqual(result.format.duration, 200.59591666666665)
    t.end()
  }).catch( function(err) {
    t.error(err)
  });
})
