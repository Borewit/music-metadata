
var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test('id3v1.1', function (t) {
  t.plan(16)

  var filePath = path.join(__dirname, 'samples', 'id3v1_Blood_Sugar.mp3');

  /*
  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/id3v1_Blood_Sugar.mp3')])
    : fs.createReadStream(filePath)\
   */

  function checkFormat (format) {
    t.strictEqual(format.headerType, 'id3v1.1', 'format.tag_type')
    t.strictEqual(format.duration, 5.4857, 'format.duration')
    t.strictEqual(format.dataformat, 'mp3', 'format.dataformat')
    t.strictEqual(format.lossless, false, 'format.lossless')
    t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz')
    t.strictEqual(format.bitrate, 160000, 'format.bitrate = 160 kbit/sec')
    t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)')
  }

  function checkCommon (common) {
    t.strictEqual(common.title, 'Blood Sugar', 'common.title')
    t.strictEqual(common.artist, 'Pendulum', 'common.artist')
    t.strictEqual(common.album, 'Blood Sugar (Single)', 'common.album')
    t.strictEqual(common.albumartist, undefined, 'common.albumartist')
    t.strictEqual(common.year, 2007, 'common.year')
    t.strictEqual(common.track.no, 1, 'common.track.no = 1')
    t.strictEqual(common.track.of, null, 'common.track.of = null')
    t.deepEqual(common.genre, ['Electronic'], 'common.genre')
    t.deepEqual(common.comment, ['abcdefg'], 'common.comment')
  }

  mm.parseFile(filePath).then( function(result) { // ToDo: remove duration
    checkFormat(result.format)

    checkCommon(result.common)

    t.end()
  }).catch(function(err) {
    t.error(err)
  })
})

