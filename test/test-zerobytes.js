var path = require('path')
var fs = require('fs')
var id3 = require('..')
var test = require('tape')

test('zero bytes', function (t) {
  t.plan(1)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/zerobytes')])
    : fs.createReadStream(path.join(__dirname, '/samples/zerobytes'))

  id3(sample, function (err) {
    t.equal(err.message, 'Could not read any data from this stream')
    t.end()
  })
})
