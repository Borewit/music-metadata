var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test('nonasciichars', function (t) {
  t.plan(2)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/bug-non ascii chars.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/bug-non ascii chars.mp3'))

  mm(sample, function (err, result) {
    t.error(err)
    t.strictEqual(result.common.artist[0],
      'Janelle Monáe/Roman Gianarthur/Nate Wonder/Roman Gianarthur', 'artist')
    t.end()
  })
})
