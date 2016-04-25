var path = require('path')
var fs = require('fs')
var id3 = require('..')
var test = require('tape')

test("shouldn't raise metadata event for files that can't be parsed", function (t) {
  t.plan(1)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__filename)])
    : fs.createReadStream(path.join(__filename))

  id3(sample, function (err, result) {
    t.equal(err.message, 'Could not find metadata header')
    t.end()
  })
})
