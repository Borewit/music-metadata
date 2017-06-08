var mm = require('..')
var fs = require('fs')
var test = require('tape')
var path = require('path')

test('concurrent-picture', function (t) {
  t.plan(4)

  var files = [path.join(__dirname, 'samples', 'flac.flac'), path.join(__dirname, 'samples', 'flac-bug.flac')];

  files.forEach(function (file) {
    mm.parseFile(file). then( function (result) {
      fs.readFile(file + '.jpg', function (err, data) {
        t.error(err, 'check on error reading file')
        t.deepEqual(result.common.picture[0].data, data, 'check picture')
      })
    }).catch( function(err) {
      t.error(err, 'catch exception')
    });
  })
})
