var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test('nonasciichars', function (t) {
  t.plan(3)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/bug-non ascii chars.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/bug-non ascii chars.mp3'))

  mm.parseStream(sample, function (err, result) {
    t.error(err)
    t.deepEqual(result.common.artist, undefined, 'common.artist')
    t.deepEqual(result.common.artists, ['Janelle Monáe', 'Roman Gianarthur', 'Nate Wonder', 'Roman Gianarthur'], 'common.artists')
    t.end()
  })
})
