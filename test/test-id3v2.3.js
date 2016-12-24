"use strict";
/* jshint maxlen: 110 */

var path = require('path')
var mm = require('..')
var fs = require('fs')
var test = require('tape')

test('id3v2.3', function (t) {
  t.plan(49)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/id3v2.3.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/id3v2.3.mp3'))

  function checkFormat (format) {
    t.strictEqual(format.headerType, 'id3v2.3', 'format.tag_type')
    t.strictEqual(format.duration, 1, 'format.duration')
    t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz')
    t.strictEqual(format.bitrate, 128000, 'format.bitrate = 128 kbit/sec')
    t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)')
    t.strictEqual(format.encoder, 'LAME3.98r', 'format.encoder')
    t.strictEqual(format.codecProfile, 'CBR', 'format.codecProfile')
  }

  function checkCommon (common) {
    t.strictEqual(common.title, 'Home', 'common.title')
    t.deepEqual(common.artists, [ 'Explosions In The Sky', 'Another', 'And Another' ], 'common.artist')
    t.strictEqual(common.albumartist, 'Soundtrack', 'common.albumartist')
    t.strictEqual(common.album, 'Friday Night Lights [Original Movie Soundtrack]', 'common.album')
    t.strictEqual(common.year, 2004, 'common.year')
    t.strictEqual(common.track.no, 5, 'common.track.no')
    t.strictEqual(common.track.of, null, 'common.track.of')
    t.strictEqual(common.disk.no, 1, 'common.disk.no')
    t.strictEqual(common.disk.of, 1, 'common.disk.of')
    t.strictEqual(common.genre[0], 'Soundtrack', 'common.genre')
    t.strictEqual(common.picture[0].format, 'jpg', 'common.picture format')
    t.strictEqual(common.picture[0].data.length, 80938, 'common.picture length')
  }

  var tpe1Counter = 0

  mm.parseStream(sample, {duration: true}, function (err, result) {
    t.error(err)

    checkFormat(result.format)

    checkCommon(result.common)

    t.end()
  })
    .on('duration', function (result) {
      t.strictEqual(result, 1, 'duration')
    })
    // aliased tests
    .on('title', function (result) {
      t.strictEqual(result, 'Home', 'aliased title')
    })
    .on('artists', function (result) {
      t.deepEqual(result,  [ 'Explosions In The Sky', 'Another', 'And Another' ], 'aliased artist')
    })
    .on('albumartist', function (result) {
      t.strictEqual(result, 'Soundtrack', 'aliased albumartist')
    })
    .on('album', function (result) {
      t.strictEqual(result, 'Friday Night Lights [Original Movie Soundtrack]', 'aliased album')
    })
    .on('year', function (result) {
      t.strictEqual(result, 2004, 'aliased year')
    })
    .on('track', function (result) {
      t.strictEqual(result.no, 5, 'aliased track no')
      t.strictEqual(result.of, null, 'aliased track of')
    })
    .on('disk', function (result) {
      t.strictEqual(result.no, 1, 'aliased disk no')
      t.strictEqual(result.of, 1, 'aliased disk of')
    })
    .on('genre', function (result) {
      t.strictEqual(result[0], 'Soundtrack', 'aliased genre')
    })
    .on('picture', function (result) {
      t.strictEqual(result[0].format, 'jpg', 'aliased picture format')
      t.strictEqual(result[0].data.length, 80938, 'aliased picture length')
    })
    // raw tests
    .on('TALB', function (result) {
      t.strictEqual(result, 'Friday Night Lights [Original Movie Soundtrack]', 'raw TALB')
    })
    .on('TPE1', function (result) {
      switch(tpe1Counter++) {
        case 0:
          t.strictEqual(result, 'Explosions In The Sky', 'raw TPE1')
          break
        case 1:
          t.strictEqual(result, 'Another', 'raw TPE1')
          break
        case 2:
          t.strictEqual(result, 'And Another', 'raw TPE1')
          break
      }
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
      t.strictEqual(result, 'Soundtrack', 'raw TCON')
    })
    .on('TIT2', function (result) {
      t.strictEqual(result, 'Home', 'raw TIT2')
    })
    .on('TRCK', function (result) {
      t.strictEqual(result, '5', 'raw TRCK')
    })
    .on('TYER', function (result) {
      t.strictEqual(result, '2004', 'raw TYER')
    })
    .on('TXXX:PERFORMER', function (result) {
      t.strictEqual(result, 'Explosions In The Sky', 'TXXX:PERFORMER')
    })
    .on('APIC', function (result) {
      t.strictEqual(result.format, 'image/jpg', 'raw APIC format')
      t.strictEqual(result.type, 'Cover (front)', 'raw APIC headerType')
      t.strictEqual(result.description, '', 'raw APIC description')
      t.strictEqual(result.data.length, 80938, 'raw APIC length')
    })
})
