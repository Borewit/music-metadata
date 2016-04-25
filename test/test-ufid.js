var path = require('path')
var fs = require('fs')
var id3 = require('..')
var test = require('tape')

test('id3v2.4', function (t) {
  t.plan(2)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/29 - Dominator.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/29 - Dominator.mp3'))

  id3(sample, function (err) {
    t.error(err)
    t.end()
  })
    .on('UFID', function (result) {
      t.deepEqual(result, {
        'owner_identifier': 'http://musicbrainz.org',
        'identifier': new Buffer([0x33, 0x66, 0x32, 0x33, 0x66, 0x32, 0x63, 0x66, 0x2d,
          0x32, 0x61, 0x34, 0x36, 0x2d, 0x34, 0x38, 0x65, 0x63, 0x2d, 0x38, 0x36, 0x33,
          0x65, 0x2d, 0x36, 0x65, 0x63, 0x34, 0x33, 0x31, 0x62, 0x35, 0x66, 0x65, 0x63,
        0x61])
      }, 'UFID')
    })
})
