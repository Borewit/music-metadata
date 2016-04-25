var mm = require('..')
var fs = require('fs')
var test = require('tape')

test('concurrent-picture', function (t) {
  t.plan(6)
  var files = ['test/samples/flac.flac', 'test/samples/flac-bug.flac']
  files.forEach(function (file) {
    mm(fs.createReadStream(file), function (err, result) {
      t.error(err)
      fs.readFile(file + '.jpg', function (err, data) {
        t.error(err)
        t.deepEqual(result.picture[0].data, data)
      })
    })
  })
})
