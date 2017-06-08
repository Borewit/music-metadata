var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test('nonasciichars', function (t) {
  t.plan(2)

  var filename = 'bug-non ascii chars.mp3';
  var filePath = path.join(__dirname, 'samples', filename);

  mm.parseFile(filePath).then(function (result) {
    t.deepEqual(result.common.artist, undefined, 'common.artist')
    t.deepEqual(result.common.artists, ['Janelle Monáe', 'Roman Gianarthur', 'Nate Wonder', 'Roman Gianarthur'], 'common.artists')
    t.end()
  }).catch(function (err) {
    t.fail(err)
  });
})
