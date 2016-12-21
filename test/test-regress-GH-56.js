var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test('mp3 cbr calculation', function (t) {
  t.plan(2)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/regress-GH-56.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/regress-GH-56.mp3'))

  mm.parseStream(sample, {'duration': true}, function (err, result) {
    t.error(err)
    t.strictEqual(result.format.duration, 373.329375, 'format.duration')
    t.end()
  })
})
