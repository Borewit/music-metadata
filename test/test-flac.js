var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test('flac', function (t) {
  t.plan(41)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/flac.flac')])
    : fs.createReadStream(path.join(__dirname, '/samples/flac.flac'))

  function checkFormat (format) {
    t.strictEqual(format.dataformat, 'flac', 'format.tag_type')
    t.strictEqual(format.headerType, 'vorbis', 'format.tag_type')
    t.strictEqual(format.duration, 271.7733333333333, 'format.duration')
    t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz')
    t.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample = 16 bit')
    t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)')
  }

  function checkCommon (common) {
    t.strictEqual(common.title, 'Brian Eno', 'common.title')
    t.deepEqual(common.artists, ['MGMT'], 'common.artist')
    t.strictEqual(common.albumartist, undefined, 'common.albumartist')
    t.strictEqual(common.album, 'Congratulations', 'common.album')
    t.strictEqual(common.year, 2010, 'common.year')
    t.deepEqual(common.track, {no: 7, of: null}, 'common.track')
    t.deepEqual(common.disk, {no: null, of: null}, 'common.disk')
    t.deepEqual(common.genre, ['Alt. Rock'], 'genre')
    t.strictEqual(common.picture[0].format, 'jpg', 'common.picture format')
    t.strictEqual(common.picture[0].data.length, 175668, 'common.picture length')
  }

  mm.parseStream(sample, function (err, metadata) {
    t.error(err)

    checkFormat(metadata.format)
    checkCommon(metadata.common)
    t.strictEqual(metadata.vorbis, undefined, 'Native metadata not requested')
    t.end()
  })
    // aliased tests
    .on('title', function (result) {
      t.strictEqual(result, 'Brian Eno', 'common.title')
    })
    .on('artist', function (result) {
      t.strictEqual(result, 'MGMT', 'common.artist')
    })
    .on('year', function (result) {
      t.strictEqual(result, 2010, 'common.year')
    })
    .on('track', function (result) {
      t.deepEqual(result, {no: 7, of: null}, 'common.track')
    })
    .on('genre', function (result) {
      t.deepEqual(result, ['Alt. Rock'], 'common.genre')
    })
    .on('picture', function (result) {
      t.strictEqual(result[0].format, 'jpg', 'common.picture format')
      t.strictEqual(result[0].data.length, 175668, 'common.picture length')
    })
    .on('comment', function (result) {
      t.strictEqual(result[0], 'EAC-Secure Mode', 'common.comment')
    })
    .on('duration', function (result) {
      t.strictEqual(result, 271.7733333333333, 'common.duration')
    })
    // raw tests
    .on('TITLE', function (result) {
      t.strictEqual(result, 'Brian Eno', 'raw TITLE')
    })
    .on('ARTIST', function (result) {
      t.strictEqual(result, 'MGMT', 'raw ARTIST')
    })
    .on('DATE', function (result) {
      t.strictEqual(result, '2010', 'raw DATE')
    })
    .on('TRACKNUMBER', function (result) {
      t.strictEqual(result, '07', 'raw TRACKNUMBER')
    })
    .on('GENRE', function (result) {
      t.strictEqual(result, 'Alt. Rock', 'raw GENRE')
    })
    .on('COMMENT', function (result) {
      t.strictEqual(result, 'EAC-Secure Mode', 'raw COMMENT')
    })
    .on('METADATA_BLOCK_PICTURE', function (result) {
      t.strictEqual(result.type, 'Cover (front)', 'raw METADATA_BLOCK_PICTUREtype')
      t.strictEqual(result.format, 'image/jpeg', 'raw METADATA_BLOCK_PICTURE format')
      t.strictEqual(result.description, '', 'raw METADATA_BLOCK_PICTURE description')
      t.strictEqual(result.width, 450, 'raw METADATA_BLOCK_PICTURE width')
      t.strictEqual(result.height, 450, 'raw METADATA_BLOCK_PICTURE height')
      t.strictEqual(result.colour_depth, 24, 'raw METADATA_BLOCK_PICTURE colour depth')
      t.strictEqual(result.indexed_color, 0, 'raw METADATA_BLOCK_PICTURE indexed_color')
      t.strictEqual(result.data.length, 175668, 'raw METADATA_BLOCK_PICTURE length')
    })
})
