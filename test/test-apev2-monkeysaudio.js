var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test('monkeysaudio (.ape)', function (t) {
  t.plan(39)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/monkeysaudio.ape')])
    : fs.createReadStream(path.join(__dirname, '/samples/monkeysaudio.ape'))

  function checkFormat (format) {
    t.strictEqual(format.headerType, 'APEv2', 'format.tag_type')
    t.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample')
    t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 [kHz]')
    t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)')
    t.strictEqual(format.duration, 1.2134240362811792, 'duration [sec]')
  }

  function checkCommon (common) {
    t.strictEqual(common.title, '07. Shadow On The Sun', 'common.title')
    t.strictEqual(common.artist, undefined, 'common.artist')
    t.deepEqual(common.artists, ['Audioslave', 'Chris Cornell'], 'common.artists')
    // Used to be ['Audioslave'], but 'APEv2/Album Artist'->'albumartist' is not set in actual file!
    t.deepEqual(common.albumartist, undefined, 'common.albumartist')
    t.strictEqual(common.album, 'Audioslave', 'common.album')
    t.strictEqual(common.year, 2002, 'common.year')
    t.deepEqual(common.genre, ['Alternative'], 'common.genre')
    t.deepEqual(common.track, { no: 7, of: null }, 'common.track')
    t.deepEqual(common.disk, { no: 3, of: null }, 'common.disk')
    t.strictEqual(common.picture[0].format, 'jpg', 'common.picture 0 format')
    t.strictEqual(common.picture[0].data.length, 48658, 'common.picture 0 length')
    t.strictEqual(common.picture[1].format, 'jpg', 'common.picture 1 format')
    t.strictEqual(common.picture[1].data.length, 48658, 'common.picture 1 length')
  }

  var artistCounter = 0

  mm.parseStream(sample, function (err, result) {
    t.error(err)

    checkFormat(result.format)

    checkCommon(result.common)

    t.end()
  })
    // aliased tests
    .on('duration', function (result) {
      t.strictEqual(result, 1.2134240362811792, 'duration')
    })
    .on('title', function (result) {
      t.strictEqual(result, '07. Shadow On The Sun', 'common.title')
    })
    .on('artist', function (result) {
      t.deepEqual(result, 'Chris Cornell', 'common.artist')
    })
    .on('artists', function (result) {
      t.deepEqual(result, ['Audioslave', 'Chris Cornell'], 'common.artists')
    })
    .on('albumartist', function (result) {
      // Used to be ['Audioslave'],
      // but 'APEv2/Album Artist'->'albumartist' is not set in actual file!
      t.deepEqual(result, [], 'common.albumartist')
    })
    .on('album', function (result) {
      t.strictEqual(result, 'Audioslave', 'common.album')
    })
    .on('track', function (result) {
      t.deepEqual(result, { no: 7, of: null }, 'common.track')
    })
    .on('disk', function (result) {
      t.deepEqual(result, { no: 3, of: null }, 'common.disk')
    })
    .on('year', function (result) {
      t.strictEqual(result, 2002, 'common.year')
    })
    .on('genre', function (result) {
      t.deepEqual(result, ['Alternative'], 'common.genre')
    })
    .on('picture', function (result) {
      t.strictEqual(result[0].format, 'jpg', 'common.picture 0 format')
      t.strictEqual(result[0].data.length, 48658, 'common.picture 0 length')
      t.strictEqual(result[1].format, 'jpg', 'common.picture 1 format')
      t.strictEqual(result[1].data.length, 48658, 'common.picture 1 length')
    })
    .on('comment', function (result) {
      t.deepEqual(result, ['This is a sample ape file'], 'common.comment')
    })
    // raw tests
    .on('ENSEMBLE', function (result) {
      t.strictEqual(result, 'Audioslave', 'raw ensemble')
    })
    .on('Artist', function (result) {
      switch(artistCounter++) {
        case 0:
          t.strictEqual(result, 'Audioslave', 'raw artist 0')
          break
        case 1:
          t.strictEqual(result, 'Chris Cornell', 'raw artist 1')
          break
      }

    })
    .on('Cover Art (Front)', function (result) {
      t.strictEqual(result.description,
        'Cover Art (Front).jpg', 'raw cover art (front) description')
      t.strictEqual(result.data.length, 48658, 'raw cover art (front) length')
    })
    .on('Cover Art (Back)', function (result) {
      t.strictEqual(result.description, 'Cover Art (Back).jpg', 'raw cover art (back) description')
      t.strictEqual(result.data.length, 48658, 'raw cover art (back) length')
    })
})
