var path = require('path')
var fs = require('fs')
var id3 = require('..')
var test = require('tape')

test('id3v2-duration-allframes', function (t) {
  t.plan(16)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/id3v2-duration-allframes.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/id3v2-duration-allframes.mp3'))

  function checkFormat(format) {
    t.strictEqual(format.headerType, 'id3v2.3', 'format.headerType')
    t.strictEqual(format.bitrate, 256000, 'format.bitrate')
    t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels')
    t.strictEqual(format.sampleRate, 44100, 'format.sampleRate')
    t.strictEqual(format.duration, 1.48928125, 'format.duration (test duration=true)')
  }
  function checkCommon(common) {
    t.strictEqual(common.title, 'Turkish Rondo', 'common.album')
    t.strictEqual(common.album, 'Piano Classics', 'common.title')
    t.strictEqual(common.year, '0', 'common.year')
    t.deepEqual(common.artist, [ 'Aubrey Hilliard' ], 'common.artist')
    t.deepEqual(common.composer, [ 'Mozart' ], 'common.composer')
    t.deepEqual(common.track, { no: 1, of: 0 }, 'common.track')
    t.deepEqual(common.genre, [ 'Classical' ], 'common.genre')
    t.deepEqual(common.disk, { no: 0, of: 0 }, 'common.disk')
    t.deepEqual(common.picture, undefined, 'common.picture')
  }

  id3(sample, {'duration': true}, function (err, result) {
    t.error(err)

    checkFormat(result.format)

    checkCommon(result.common)

    t.end()
  })
    .on('duration', function (result) {
      t.strictEqual(result, 1.48928125, 'duration')
    })
})
