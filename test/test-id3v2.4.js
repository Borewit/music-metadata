/* jshint maxlen: 110 */

var path = require('path')
var fs = require('fs')
var id3 = require('..')
var test = require('tape')

test('id3v2.4', function (t) {
  t.plan(58)
  var apicCounter = 0
  var tconCounter = 0
  var tpe1Counter = 0

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/id3v2.4.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/id3v2.4.mp3'))

  id3(sample, {'duration': true}, function (err, result) {
    t.error(err)
    t.strictEqual(result.common.title, 'Home', 'title')
    t.strictEqual(result.common.artist[0], 'Explo', 'artist 0')
    t.strictEqual(result.common.artist[1], 'ions', 'artist 1')
    t.strictEqual(result.common.artist[2], 'nodejsftws', 'artist 2')
    t.strictEqual(result.common.albumartist[0], 'Soundtrack', 'albumartist')
    t.strictEqual(result.common.album, 'Friday Night Lights [Original Movie Soundtrack]', 'album')
    t.strictEqual(result.common.year, '2004', 'year')
    t.strictEqual(result.common.track.no, 5, 'track no')
    t.strictEqual(result.common.track.of, 0, 'track of')
    t.strictEqual(result.common.disk.no, 1, 'disk no')
    t.strictEqual(result.common.disk.of, 1, 'disk of')
    t.strictEqual(result.common.genre[0], 'Soundtrack', 'genre 0')
    t.strictEqual(result.common.genre[1], 'OST', 'genre 1')
    t.strictEqual(result.common.picture[0].format, 'jpg', 'picture 0 format')
    t.strictEqual(result.common.picture[0].data.length, 80938, 'picture 0 length')
    t.strictEqual(result.common.picture[1].format, 'jpg', 'picture 1 format')
    t.strictEqual(result.common.picture[1].data.length, 80938, 'picture 1 length')
    t.strictEqual(result.common.duration, 1, 'metadata duration')
    t.end()
  })
    .on('duration', function (result) {
      t.strictEqual(result, 1, 'duration')
    })
    // aliased tests
    .on('title', function (result) {
      t.strictEqual(result, 'Home', 'aliased title')
    })
    .on('artist', function (result) {
      t.strictEqual(result[0], 'Explo', 'aliased artist 0')
      t.strictEqual(result[1], 'ions', 'aliased artist 1')
      t.strictEqual(result[2], 'nodejsftws', 'aliased artist 2')
    })
    .on('albumartist', function (result) {
      t.strictEqual(result[0], 'Soundtrack', 'aliased albumartist')
    })
    .on('album', function (result) {
      t.strictEqual(result, 'Friday Night Lights [Original Movie Soundtrack]', 'aliased album')
    })
    .on('year', function (result) {
      t.strictEqual(result, '2004', 'aliased year')
    })
    .on('track', function (result) {
      t.strictEqual(result.no, 5, 'aliased track no')
      t.strictEqual(result.of, 0, 'aliased track of')
    })
    .on('disk', function (result) {
      t.strictEqual(result.no, 1, 'aliased disk no')
      t.strictEqual(result.of, 1, 'aliased disk of')
    })
    .on('genre', function (result) {
      t.strictEqual(result[0], 'Soundtrack', 'aliased genre 0')
      t.strictEqual(result[1], 'OST', 'aliased genre 1')
    })
    .on('picture', function (result) {
      t.strictEqual(result[0].format, 'jpg', 'aliased picture 0 format')
      t.strictEqual(result[0].data.length, 80938, 'aliased picture 0 length')
      t.strictEqual(result[1].format, 'jpg', 'aliased picture 1 format')
      t.strictEqual(result[1].data.length, 80938, 'aliased picture 1 length')
    })
    // raw tests
    .on('TALB', function (result) {
      t.strictEqual(result, 'Friday Night Lights [Original Movie Soundtrack]', 'raw TALB')
    })
    .on('TPE1', function (result) {
      if (tpe1Counter === 0) {
        t.strictEqual(result, 'Explo', 'raw TPE1 0')
      }
      if (tpe1Counter === 1) {
        t.strictEqual(result, 'ions', 'raw TPE1 1')
      }
      if (tpe1Counter === 2) {
        t.strictEqual(result, 'nodejsftws', 'raw TPE1 2')
      }
      tpe1Counter++
    })
    .on('TPE2', function (result) {
      t.strictEqual(result, 'Soundtrack', 'raw TPE2')
    })
    .on('TCOM', function (result) {
      t.strictEqual(result, 'Explosions in the Sky', 'raw TCOM')
    })
    .on('TPOS', function (result) {
      t.strictEqual(result, '1/1', 'raw TPOS')
    })
    .on('TCON', function (result) {
      if (tconCounter === 0) {
        t.strictEqual(result, 'Soundtrack', 'raw TCON 0')
      }
      if (tconCounter === 1) {
        t.strictEqual(result, 'OST', 'raw TCON 1')
      }
      tconCounter++
    })
    .on('TIT2', function (result) {
      t.strictEqual(result, 'Home', 'raw TIT2')
    })
    .on('TRCK', function (result) {
      t.strictEqual(result, '5', 'raw TRCK')
    })
    .on('TDRC', function (result) {
      t.strictEqual(result, '2004', 'raw TDRC')
    })
    .on('TXXX', function (result) {
      t.deepEqual(result, {description: 'PERFORMER', text: 'Explosions In The Sky'}, 'TXXX:PERFORMER')
    })
    .on('APIC', function (result) {
      if (apicCounter === 0) {
        t.strictEqual(result.format, 'image/jpg', 'raw APIC 0 format')
        t.strictEqual(result.type, 'Cover (front)', 'raw APIC 0 type')
        t.strictEqual(result.description, 'some description', 'raw APIC 0 description')
        t.strictEqual(result.data.length, 80938, 'raw APIC 0 length')
      }
      if (apicCounter === 1) {
        t.strictEqual(result.format, 'image/jpeg', 'raw APIC 1 format')
        t.strictEqual(result.type, 'Cover (back)', 'raw APIC 1 type')
        t.strictEqual(result.description, 'back', 'raw APIC 1 description')
        t.strictEqual(result.data.length, 80938, 'raw APIC 1 length')
      }
      apicCounter++
    })
})
