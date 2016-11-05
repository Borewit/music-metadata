/* jshint maxlen: 130 */

var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test('flac', function (t) {
  t.plan(51)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/MusicBrainz-Picard-tags.flac')])
    : fs.createReadStream(path.join(__dirname, '/samples/MusicBrainz-Picard-tags.flac'))

  mm(sample, function (err, result) {
    t.error(err)
    t.strictEqual(result.title, 'Brian Eno', 'title')
    t.strictEqual(result.artist[0], 'MGMT', 'artist')
    t.strictEqual(result.albumartist.length, 1, 'albumartist length')
    t.strictEqual(result.album, 'Oracular Spectacular / Congratulations', 'album')
    t.strictEqual(result.year, '2011-09-11', 'originalyear') // ToDo: 'year' should actually be mapped to date
    t.strictEqual(result.track.no, 7, 'track no')
    t.strictEqual(result.track.of, 9, 'track of')
    t.strictEqual(result.disk.no, 2, 'disk no')
    t.strictEqual(result.disk.of, 2, 'disk of')
    t.strictEqual(result.genre[0], 'Alt. Rock', 'genre')
    t.strictEqual(result.picture[0].format, 'jpg', 'picture format')
    t.strictEqual(result.picture[0].data.length, 175668, 'picture length')
    t.strictEqual(result.duration, 271.7733333333333, 'duration')

    t.end()
  })

  // aliased tests
    .on('title', function (result) {
      t.strictEqual(result, 'Brian Eno', 'aliased title')
    })
    .on('artist', function (result) {
      t.strictEqual(result[0], 'MGMT', 'aliased artist')
    })
    .on('year', function (result) {
      // ToDo: 'year' should actually be mapped to date
      t.strictEqual(result, '2011-09-11', 'aliased year')
    })
    .on('track', function (result) {
      t.strictEqual(result.no, 7, 'aliased track no')
      t.strictEqual(result.of, 9, 'aliased track of (total)')
    })
    .on('genre', function (result) {
      t.strictEqual(result[0], 'Alt. Rock', 'aliased genre')
    })
    .on('picture', function (result) {
      t.strictEqual(result[0].format, 'jpg', 'aliased picture format')
      t.strictEqual(result[0].data.length, 175668, 'aliased picture length')
    })
    .on('comment', function (result) {
      t.strictEqual(result[0], 'EAC-Secure Mode', 'aliased comment')
    })
    .on('duration', function (result) {
      t.strictEqual(result, 271.7733333333333, 'aliased duration')
    })
    // raw tests
    .on('TITLE', function (result) {
      t.strictEqual(result, 'Brian Eno', 'raw TITLE')
    })
    .on('ARTIST', function (result) {
      t.strictEqual(result, 'MGMT', 'raw ARTIST')
    })
    .on('DATE', function (result) {
      t.strictEqual(result, '2011-09-11', 'raw DATE')
    })
    .on('TRACKNUMBER', function (result) {
      t.strictEqual(result, '7', 'raw TRACKNUMBER')
    })
    .on('GENRE', function (result) {
      t.strictEqual(result, 'Alt. Rock', 'raw GENRE')
    })
    .on('COMMENT', function (result) {
      t.strictEqual(result, 'EAC-Secure Mode', 'raw COMMENT')
    })
    .on('METADATA_BLOCK_PICTURE', function (result) {
      t.strictEqual(result.type, 'Cover (front)', 'raw METADATA_BLOCK_PICTURE type')
      t.strictEqual(result.format, 'image/jpeg', 'raw METADATA_BLOCK_PICTURE format')
      t.strictEqual(result.description, '', 'raw METADATA_BLOCK_PICTURE description')
      t.strictEqual(result.width, 450, 'raw METADATA_BLOCK_PICTURE width')
      t.strictEqual(result.height, 450, 'raw METADATA_BLOCK_PICTURE height')
      t.strictEqual(result.colour_depth, 24, 'raw METADATA_BLOCK_PICTURE colour depth')
      t.strictEqual(result.indexed_color, 0, 'raw METADATA_BLOCK_PICTURE indexed_color')
      t.strictEqual(result.data.length, 175668, 'raw METADATA_BLOCK_PICTURE length')
    })
    /* Test MusicBrainz / Picard tags */
    .on('date', function (result) {
      t.strictEqual(result[0], '2011-09-11', 'aliased date') // ToDo: not called
    })
    .on('releasecountry', function (result) {
      t.strictEqual(result[0], 'XE', 'aliased releasecountry')
    })
    .on('asin', function (result) {
      t.strictEqual(result[0], 'B0055U9LNC', 'aliased asin')
    })
    .on('musicbrainz_albumid', function (result) {
      t.strictEqual(result[0], '6032dfc4-8880-4fea-b1c0-aaee52e1113c', 'aliased musicbrainz_albumid')
    })
    .on('musicbrainz_recordingid', function (result) {
      t.strictEqual(result[0], 'b0c1d984-ba93-4167-880a-ac02255bf9e7', 'aliased musicbrainz_recordingid')
    })
    .on('musicbrainz_albumartistid', function (result) {
      t.strictEqual(result[0], 'c485632c-b784-4ee9-8ea1-c5fb365681fc', 'aliased musicbrainz_albumartistid')
    })
    .on('musicbrainz_artistid', function (result) {
      t.strictEqual(result[0], 'c485632c-b784-4ee9-8ea1-c5fb365681fc', 'aliased musicbrainz_artistid')
    })
    .on('musicbrainz_releasegroupid', function (result) {
      t.strictEqual(result[0], '9a3237f4-c2a5-467f-9a8e-fe1d247ff520', 'aliased musicbrainz_releasegroupid')
    })
    .on('musicbrainz_trackid', function (result) {
      t.strictEqual(result[0], '0f53f7a3-89df-4069-9357-d04252239b6d', 'aliased musicbrainz_trackid')
    })
    .on('label', function (result) {
      t.strictEqual(result[0], 'Sony Music', 'aliased label')
    })
    .on('barcode', function (result) {
      t.strictEqual(result[0], '886979357723', 'aliased barcode')
    })
    .on('originalyear', function (result) {
      t.strictEqual(result[0], '2011', 'aliased originalyear')
    })
    .on('originaldate', function (result) {
      t.strictEqual(result[0], '2011-09-11', 'aliased originaldate')
    })
    .on('releasestatus', function (result) {
      t.strictEqual(result[0], 'official', 'aliased releasestatus')
    })
    .on('releasetype', function (result) {

      t.strictEqual(result.length, 2, 'aliased releasetype: 2 items')
    })
})
