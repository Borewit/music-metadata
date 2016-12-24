var path = require('path')
var mm = require('..')
var fs = require('fs')
var test = require('tape')

test('audio-frame-header-bug', function (t) {
  t.plan(2)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/audio-frame-header-bug.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/audio-frame-header-bug.mp3'))

  mm.parseStream(sample, { duration: true }, function (err, result) {
    t.error(err)
    t.strictEqual(result.format.duration, 200.59591666666665)
    t.end()
  })
})
