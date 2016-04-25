var path = require('path')
var fs = require('fs')
var id3 = require('..')
var test = require('tape')

test('id3v2.4', function (t) {
  t.plan(10)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/id3v2-utf16.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/id3v2-utf16.mp3'))

  id3(sample, function (err, result) {
    t.error(err)
    t.strictEqual(result.title, 'Redial (Feat. LeafRunner and Nowacking)', 'title')
    t.strictEqual(result.artist[0], 'YourEnigma', 'artist 0')
    t.strictEqual(result.year, '2014', 'year')
    t.strictEqual(result.picture[0].format, 'jpg', 'picture 0 format')
    t.strictEqual(result.picture[0].data.length, 214219, 'picture 0 length')
    t.deepEqual(result.picture[0].data.slice(0, 2), new Buffer([0xFF, 0xD8]),
      'picture 0 JFIF magic header')
    t.end()
  })
    .on('COMM', function (result) {
      t.strictEqual(result.language, 'eng')
      t.strictEqual(result.description, '')
      t.strictEqual(result.text, 'Visit http://yourenigma.bandcamp.com')
    })
})
