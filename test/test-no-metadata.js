var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test("shouldn't raise metadata event for files that can't be parsed", function (t) {
  t.plan(1)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__filename)])
    : fs.createReadStream(path.join(__filename))

  mm.parseStream(sample, function (err, result) {
    t.strictEqual(err.message, 'Could not find metadata header')
    t.end()
  })
})
