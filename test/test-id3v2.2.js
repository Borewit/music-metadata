var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test('id3v2.2', function (t) {
  t.plan(46)
  var comCounter = 0

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/id3v2.2.mp3')])
    : fs.createReadStream(path.join(__dirname, '/samples/id3v2.2.mp3'))

  mm.parseStream(sample, function (err, result) {
    t.error(err, 'no error')

    t.strictEqual(result.common.title, 'You Are The One', 'title')
    t.strictEqual(result.common.artist, 'Shiny Toy Guns', 'artist')
    t.strictEqual(result.common.album, 'We Are Pilots', 'album')
    t.strictEqual(result.common.year, 2006, 'year')
    t.strictEqual(result.common.track.no, 1, 'track no')
    t.strictEqual(result.common.track.of, 11, 'track of')
    t.deepEqual(result.common.genre, ['Alternative'], 'genre')
    t.strictEqual(result.common.picture[0].format, 'jpg', 'picture format')
    t.strictEqual(result.common.picture[0].data.length, 99738, 'picture length')
    t.strictEqual(result.common.comment.length, 4, 'Number of Expected comment fields')

    t.end()
  })
    // aliased tests
    .on('title', function (result) {
      t.strictEqual(result, 'You Are The One', 'aliased title')
    })
    .on('artist', function (result) {
      t.deepEqual(result, 'Shiny Toy Guns', 'aliased artist')
    })
    .on('album', function (result) {
      t.strictEqual(result, 'We Are Pilots', 'aliased album')
    })
    .on('year', function (result) {
      t.strictEqual(result, 2006, 'aliased year')
    })
    .on('track', function (result) {
      t.deepEqual(result, {no: 1, of: 11}, 'aliased track no')
    })
    .on('genre', function (result) {
      t.deepEqual(result, ['Alternative'], 'aliased genre')
    })
    .on('encodedby', function (result) {
      t.deepEqual(result, 'iTunes v7.0.2.16', 'aliased encodedby')
    })
    .on('picture', function (result) {
      t.strictEqual(result[0].format, 'jpg', 'aliased picture format')
      t.strictEqual(result[0].data.length, 99738, 'aliased picture length')
    })
    // raw tests
    .on('TP1', function (result) {
      t.strictEqual(result, 'Shiny Toy Guns', 'raw TP1')
    })
    .on('TRK', function (result) {
      t.strictEqual(result, '1/11', 'raw TRK')
    })
    .on('TYE', function (result) {
      t.strictEqual(result, '2006', 'raw TYE')
    })
    .on('TEN', function (result) {
      t.strictEqual(result, 'iTunes v7.0.2.16', 'raw TEN')
    })
    .on('TCO', function (result) {
      t.strictEqual(result, '(20)', 'raw TCO') // Alternative
    })
    .on('TAL', function (result) {
      t.strictEqual(result, 'We Are Pilots', 'raw TAL')
    })
    .on('TT2', function (result) {
      t.strictEqual(result, 'You Are The One', 'raw TT2')
    })
    .on('PIC', function (result) {
      t.strictEqual(result.format, 'JPG', 'raw PIC format')
      t.strictEqual(result.type, 'Other', 'raw PIC type')
      t.strictEqual(result.description, '', 'raw PIC description')
      t.strictEqual(result.data.length, 99738, 'raw PIC length')
    })
    .on('ULT', function (result) {
      t.strictEqual(result.description, '', 'raw ULT descriptor')
      t.strictEqual(result.language, 'eng', 'raw ULT language')
      // skipping testing exact contents, bit naughty
      t.strictEqual(result.text.length, 831, 'raw ULT text length')
    })
    // there are 3 comment frames in this file so we need to t all 3 events
    .on('COM', function (result) {
      switch (comCounter) {
        case 0:
          t.strictEqual(result.language, 'eng', 'raw COM 0 language')
          t.strictEqual(result.description, 'iTunPGAP', 'raw COM 0 description')
          t.strictEqual(result.text, '0', 'raw COM 0 text')
          break
        case 1:
          t.strictEqual(result.language, 'eng', 'raw COM 1 language')
          t.strictEqual(result.description, 'iTunNORM', 'raw COM 1 description')
          var expected = ' 0000299C 0000291D 0000DBE0 0000D6BA ' +
          '0003C378 0003C2C1 0000902A 00008F1B 00012FC6 00015FBC'
          t.strictEqual(result.text, expected, 'raw COM 1 text')
          break
        case 2:
          t.strictEqual(result.language, 'eng', 'raw COM 2 language')
          t.strictEqual(result.description, 'iTunSMPB', 'raw COM 2 description')
          expected = ' 00000000 00000210 00000AD4 0000000000B6499C 00000000 ' +
          '006327AD 00000000 00000000 00000000 00000000 00000000 00000000'
          t.strictEqual(result.text, expected, 'raw COM 2 text')
          break
        case 3:
          t.strictEqual(result.language, 'eng', 'raw COM 3 language')
          t.strictEqual(result.description, 'iTunes_CDDB_IDs', 'raw COM 3 description')
          t.strictEqual(result.text,
            '11+3ABC77F16B8A2F0F1E1A1EBAB868A98F+8210091', 'raw COM 3 text')
          break
      }
      comCounter++
    })
})
