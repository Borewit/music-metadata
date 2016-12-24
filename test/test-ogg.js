var path = require('path')
var mm = require('..')
var fs = require('fs')
var test = require('tape')

test('ogg', function (t) {
  t.plan(47)
  var comCounter = 0
  var genCounter = 0

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/oggy.ogg')])
    : fs.createReadStream(path.join(__dirname, '/samples/oggy.ogg'))

  function checkFormat (format) {
    t.strictEqual(format.headerType, 'vorbis', 'format.tagType')
    t.strictEqual(format.duration, 0, 'format.duration = 0 sec')
    t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz')
    t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 (stereo)')
    t.strictEqual(format.bitrate, 64000, 'bitrate = 64 kbit/sec')
  }

  function checkCommon (common) {
    t.strictEqual(common.title, 'In Bloom', 'common.title')
    t.strictEqual(common.artist, 'Nirvana', 'common.artist')
    t.strictEqual(common.albumartist, 'Nirvana', 'common.albumartist')
    t.strictEqual(common.album, 'Nevermind', 'common.album')
    t.strictEqual(common.year, 1991, 'common.year')
    t.deepEqual(common.track, {no: 1, of: 12}, 'common.track')
    t.deepEqual(common.disk, {no: 1, of: null}, 'common.disk')
    t.deepEqual(common.genre, ['Grunge', 'Alternative'], 'genre')
    t.strictEqual(common.picture[0].format, 'jpg', 'picture format')
    t.strictEqual(common.picture[0].data.length, 30966, 'picture length')
  }


  mm.parseStream(sample, { duration: true }, function (err, result) {
    t.error(err)

    checkFormat (result.format)
    checkCommon (result.common)

    t.end()
  })
    .on('duration', function (result) {
      t.strictEqual(result, 0, 'duration')
    })
    // aliased tests
    .on('title', function (result) {
      t.strictEqual(result, 'In Bloom', 'aliased title')
    })
    .on('artist', function (result) {
      t.strictEqual(result, 'Nirvana', 'aliased artist')
    })
    .on('albumartist', function (result) {
      t.strictEqual(result, 'Nirvana', 'aliased albumartist')
    })
    .on('album', function (result) {
      t.strictEqual(result, 'Nevermind', 'aliased album')
    })
    .on('year', function (result) {
      t.strictEqual(result, 1991, 'aliased year')
    })
    .on('track', function (result) {
      t.deepEqual(result, {no: 1, of: 12}, 'aliased track')
    })
    .on('disk', function (result) {
      t.deepEqual(result, {no: 1, of: null}, 'aliased disk')
    })
    .on('genre', function (result) {
      t.deepEqual(result, ['Grunge',  'Alternative'], 'aliased genre')
    })
    .on('picture', function (result) {
      t.strictEqual(result[0].format, 'jpg', 'aliased picture format')
      t.strictEqual(result[0].data.length, 30966, 'aliased picture length')
    })
    // raw tests
    .on('TRACKTOTAL', function (result) {
      t.strictEqual(result, '12', 'raw TRACKTOTAL')
    })
    .on('ALBUM', function (result) {
      t.strictEqual(result, 'Nevermind', 'raw ALBUM')
    })
    .on('ARTIST', function (result) {
      t.strictEqual(result, 'Nirvana', 'raw ARTIST')
    })
    .on('COMMENT', function (result) {
      switch (comCounter) {
        case 0:
          t.strictEqual(result, "Nirvana's Greatest Album", 'raw COMMENT 0')
          break
        case 1:
          t.strictEqual(result, 'And their greatest song', 'raw COMMENT 1')
          break
      }
      comCounter++
    })
    .on('GENRE', function (result) {
      switch (genCounter) {
        case 0:
          t.strictEqual(result, 'Grunge', 'raw GENRE 0')
          break
        case 1:
          t.strictEqual(result, 'Alternative', 'raw GENRE 1')
          break
      }
      genCounter++
    })
    .on('TITLE', function (result) {
      t.strictEqual(result, 'In Bloom', 'raw TITLE')
    })
    .on('ALBUMARTIST', function (result) {
      t.strictEqual(result, 'Nirvana', 'raw ALBUMARTIST')
    })
    .on('DISCNUMBER', function (result) {
      t.strictEqual(result, '1', 'raw DISCNUMBER')
    })
    .on('DATE', function (result) {
      t.strictEqual(result, '1991', 'raw DATE')
    })
    .on('TRACKNUMBER', function (result) {
      t.strictEqual(result, '1', 'raw TRACKNUMBER')
    })
    .on('METADATA_BLOCK_PICTURE', function (result) {
      t.strictEqual(result.format, 'image/jpeg', 'raw METADATA_BLOCK_PICTURE format')
      t.strictEqual(result.type, 'Cover (back)', 'raw METADATA_BLOCK_PICTURE headerType')
      t.strictEqual(result.description, 'little willy', 'raw METADATA_BLOCK_PICTURE description')
      // test exact contents too
      t.strictEqual(result.data.length, 30966, 'raw METADATA_BLOCK_PICTURE length')
      t.strictEqual(result.data[0], 255, 'raw METADATA_BLOCK_PICTURE data 0')
      t.strictEqual(result.data[1], 216, 'raw METADATA_BLOCK_PICTURE data 1')
      t.strictEqual(result.data[result.data.length - 1], 217, 'raw METADATA_BLOCK_PICTURE data -1')
      t.strictEqual(result.data[result.data.length - 2], 255, 'raw METADATA_BLOCK_PICTURE data -2')
    })
});
