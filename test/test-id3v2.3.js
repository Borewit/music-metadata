/* jshint maxlen: 110 */

var path = require('path')
var id3 = require('..')
var fs = require('fs')
var test = require('tape')

test('id3v2.3', function (t) {
  t.plan(45)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/id3v2.3.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/id3v2.3.mp3'))

  function checkFormat (format) {
    t.strictEqual(format.tagType, 'id3v2.3', 'format.tag_type')
    t.strictEqual(format.duration, 1, 'format.duration')
    t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz')
    t.strictEqual(format.bitrate, 128000, 'format.bitrate = 128 kbit/sec')
    t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)')
  }

  function checkCommon (common) {
    t.strictEqual(common.title, 'Home', 'title')
    t.strictEqual(common.artist[0], 'Explosions In The Sky/Another/And Another', 'artist')
    t.strictEqual(common.albumartist[0], 'Soundtrack', 'albumartist')
    t.strictEqual(common.album, 'Friday Night Lights [Original Movie Soundtrack]', 'album')
    t.strictEqual(common.year, '2004', 'year')
    t.strictEqual(common.track.no, 5, 'track no')
    t.strictEqual(common.track.of, 0, 'track of')
    t.strictEqual(common.disk.no, 1, 'disk no')
    t.strictEqual(common.disk.of, 1, 'disk of')
    t.strictEqual(common.genre[0], 'Soundtrack', 'genre')
    t.strictEqual(common.picture[0].format, 'jpg', 'picture format')
    t.strictEqual(common.picture[0].data.length, 80938, 'picture length')
  }

  id3(sample, {duration: true}, function (err, result) {
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
    .on('artist', function (result) {
      t.strictEqual(result[0], 'Explosions In The Sky/Another/And Another', 'aliased artist 0')
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
      t.strictEqual(result, 'Explosions In The Sky/Another/And Another', 'raw TPE1')
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
    .on('TXXX', function (result) {
      t.deepEqual(result, {description: 'PERFORMER', text: 'Explosions In The Sky'}, 'TXXX:PERFORMER')
    })
    .on('APIC', function (result) {
      t.strictEqual(result.format, 'image/jpg', 'raw APIC format')
      t.strictEqual(result.type, 'Cover (front)', 'raw APIC type')
      t.strictEqual(result.description, '', 'raw APIC description')
      t.strictEqual(result.data.length, 80938, 'raw APIC length')
    })
})
