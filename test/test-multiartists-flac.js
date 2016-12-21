/* jshint maxlen: 140 */

var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test('Test multi-artists flac', function (t) {
  t.plan(115)

  var filename = 'MusicBrainz-multiartist.flac'

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/' + filename)])
    : fs.createReadStream(path.join(__dirname, '/samples/' + filename))

  function checkFormat (format) {
    t.strictEqual(format.duration, 2.1229931972789116, 'format.duration = 2.123 seconds')
    t.strictEqual(format.sampleRate, 44100, 'format.sampleRate')
    t.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample')
    t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels')
  }

  function checkCommonTags (common) {
    // Compare expectedCommonTags with result.common
    t.strictEqual(common.title, 'Sinner\'s Prayer', 'common.tagtitle')
    t.strictEqual(common.artist, 'Beth Hart & Joe Bonamassa', 'common.artist')
    t.deepEqual(common.artists, ['Beth Hart', 'Joe Bonamassa'], 'common.artists')
    t.strictEqual(common.albumartist, 'Beth Hart & Joe Bonamassa', 'common.albumartist')
    t.strictEqual(common.albumartistsort, 'Hart, Beth & Bonamassa, Joe', 'common.albumsort')
    t.strictEqual(common.album, 'Don\'t Explain', 'common.album = Don\'t Explain')
    t.deepEqual(common.track, { no: 1, of: 10 }, 'common.track')
    t.deepEqual(common.disk, { no: 1, of: 1 }, 'common.disk')
    t.strictEqual(common.date, '2011-09-27', 'common.date')
    t.strictEqual(common.year, 2011, 'common.year')
    t.strictEqual(common.media, 'CD', 'common.media = CD')
    t.strictEqual(common.barcode, '804879313915', 'common.barcode')
    t.deepEqual(common.producer, ['Roy Weisman'], 'common.producer = Roy Weisman')
    t.strictEqual(common.label, 'J&R Adventures', 'common.label = J&R Adventures')
    t.strictEqual(common.catalognumber, 'PRAR931391', 'common.catalognumber = PRAR931391')
    t.strictEqual(common.originalyear, 2011, 'common.originalyear = 2011')
    t.strictEqual(common.originaldate, '2011-09-26', 'common.originaldate = 2011-09-26')
    t.strictEqual(common.releasestatus, 'official', 'common.releasestatus = official')
    t.deepEqual(common.releasetype, ['album'], 'common.releasetype')
    t.deepEqual(common.notes, ['Medieval CUE Splitter (www.medieval.it)'], 'common.note')
    t.strictEqual(common.musicbrainz_albumid, 'e7050302-74e6-42e4-aba0-09efd5d431d8', 'common.musicbrainz_albumid')
    t.strictEqual(common.musicbrainz_recordingid, 'f151cb94-c909-46a8-ad99-fb77391abfb8', 'common.musicbrainz_recordingid')
    t.deepEqual(common.musicbrainz_albumartistid, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'common.musicbrainz_albumartistid')
    t.deepEqual(common.musicbrainz_artistid, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'common.musicbrainz_artistid')
    t.strictEqual(common.musicbrainz_releasegroupid, 'e00305af-1c72-469b-9a7c-6dc665ca9adc', 'common.musicbrainz_releasegroupid')
    t.strictEqual(common.musicbrainz_trackid, 'd062f484-253c-374b-85f7-89aab45551c7', 'common.musicbrainz_trackid')
    t.strictEqual(common.releasecountry, 'GB', 'common.releasecountry')
    t.strictEqual(common.asin, 'B004X5SCGM', 'common.asin')

    t.strictEqual(common.picture[0].format, 'jpg', 'picture format')
    t.strictEqual(common.picture[0].data.length, 98008, 'picture length')
  }

  function checkVorbisTags (vorbis) {
    // Compare expectedCommonTags with result.common
    t.strictEqual(vorbis.TITLE, 'Sinner\'s Prayer', 'vorbis.TITLE')
    t.strictEqual(vorbis.ALBUM, 'Don\'t Explain', 'vorbis.TITLE')
    t.strictEqual(vorbis.DATE, '2011-09-27', 'vorbis.DATE')
    t.strictEqual(vorbis.TRACKNUMBER, '1', 'vorbis.TRACKNUMBER')
    t.deepEqual(vorbis.PRODUCER, ['Roy Weisman'], 'vorbis.PRODUCER')
    t.deepEqual(vorbis.ENGINEER, ['James McCullagh', 'Jared Kvitka'], 'vorbis.ENGINEER')
    t.strictEqual(vorbis.LABEL, 'J&R Adventures', 'vorbis.LABEL')
    t.strictEqual(vorbis.CATALOGNUMBER, 'PRAR931391', 'vorbis.CATALOGNUMBER')
    t.strictEqual(vorbis.ACOUSTID_ID, '09c06fac-679a-45b1-8ea0-6ce532318363', 'vorbis.ACOUSTID_ID')
    t.strictEqual(vorbis.ARTIST, 'Beth Hart & Joe Bonamassa', 'vorbis.ARTIST')
    t.deepEqual(vorbis.ARTISTS, ['Beth Hart', 'Joe Bonamassa'], 'vorbis.ARTISTS')
    t.strictEqual(vorbis.ARTISTSORT, 'Hart, Beth & Bonamassa, Joe', 'vorbis.ARTISTSORT')
    t.strictEqual(vorbis.ALBUMARTIST, 'Beth Hart & Joe Bonamassa', 'vorbis.ALBUMARTIST')
    t.strictEqual(vorbis.ALBUMARTISTSORT, 'Hart, Beth & Bonamassa, Joe', 'vorbis.ALBUMARTISTSORT')
    t.deepEqual(vorbis.ORIGINALDATE, '2011-09-26', 'vorbis.ORIGINALDATE')
    t.strictEqual(vorbis.SCRIPT, 'Latn', 'vorbis.SCRIPT')
    t.deepEqual(vorbis.MEDIA, 'CD', 'vorbis.MEDIA')
    t.deepEqual(vorbis.MUSICBRAINZ_ALBUMID, 'e7050302-74e6-42e4-aba0-09efd5d431d8', 'vorbis.MUSICBRAINZ_ALBUMID')
    t.deepEqual(vorbis.MUSICBRAINZ_ALBUMARTISTID, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'vorbis.MUSICBRAINZ_ALBUMARTISTID')
    t.deepEqual(vorbis.MUSICBRAINZ_ARTISTID, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'vorbis.MUSICBRAINZ_ARTISTID')
    t.deepEqual(vorbis.PERFORMER, ['Carmine Rojas (bass guitar)', 'The Bovaland Orchestra (orchestra)', 'Anton Fig (drums)', 'Anton Fig (percussion)', 'Blondie Chaplin (guitar)',
      'Joe Bonamassa (guitar)', 'Arlan Scheirbaum (keyboard)', 'Beth Hart (vocals)', 'Joe Bonamassa (vocals)', 'Beth Hart (piano)'], 'vorbis.PERFORMER')
    t.deepEqual(vorbis.ARRANGER, ['Jeff Bova'], 'vorbis.ARRANGER')
    t.strictEqual(vorbis.MUSICBRAINZ_ALBUMID, 'e7050302-74e6-42e4-aba0-09efd5d431d8', 'vorbis.MUSICBRAINZ_ALBUMID')
    t.strictEqual(vorbis.MUSICBRAINZ_RELEASETRACKID, 'd062f484-253c-374b-85f7-89aab45551c7', 'vorbis.MUSICBRAINZ_RELEASETRACKID')
    t.strictEqual(vorbis.MUSICBRAINZ_RELEASEGROUPID, 'e00305af-1c72-469b-9a7c-6dc665ca9adc', 'vorbis.MUSICBRAINZ_RELEASEGROUPID')
    t.strictEqual(vorbis.MUSICBRAINZ_TRACKID, 'f151cb94-c909-46a8-ad99-fb77391abfb8', 'vorbis.MUSICBRAINZ_TRACKID')
    t.deepEqual(vorbis.NOTES, ['Medieval CUE Splitter (www.medieval.it)'], 'vorbis.NOTES')
    t.strictEqual(vorbis.BARCODE, '804879313915', 'vorbis.BARCODE')
    t.strictEqual(vorbis.ASIN, 'B004X5SCGM', 'vorbis.ASIN')
    t.strictEqual(vorbis.RELEASECOUNTRY, 'GB', 'vorbis.RELEASECOUNTRY')
    t.strictEqual(vorbis.RELEASESTATUS, 'official', 'vorbis.RELEASESTATUS')

    t.strictEqual(vorbis.METADATA_BLOCK_PICTURE[0].format, 'image/jpeg', 'vorbis.METADATA_BLOCK_PICTURE.format')
    t.strictEqual(vorbis.METADATA_BLOCK_PICTURE[0].type, 'Cover (front)', 'vorbis.METADATA_BLOCK_PICTURE.type') // ToDo: description??
    t.strictEqual(vorbis.METADATA_BLOCK_PICTURE[0].width, 0, 'vorbis.METADATA_BLOCK_PICTURE.width')
    t.strictEqual(vorbis.METADATA_BLOCK_PICTURE[0].height, 0, 'vorbis.METADATA_BLOCK_PICTURE.height')
    t.strictEqual(vorbis.METADATA_BLOCK_PICTURE[0].data.length, 98008, 'vorbis.METADATA_BLOCK_PICTURE.data.length')
    t.strictEqual(vorbis.METADATA_BLOCK_PICTURE[0].description, '', 'vorbis.METADATA_BLOCK_PICTURE.description')

  }

  var countMusicBrainzAlbumArtistId = 0
  var countMusicBrainzArtistId = 0
  var countEngineer = 0
  var countPerformer = 0

  // Run with default options
  mm.parseStream(sample, {native: true}, function (err, result) {
    t.error(err)
    t.ok(result.hasOwnProperty('vorbis'), 'should include native Vorbis tags')
    checkFormat(result.format)
    checkVorbisTags(result.vorbis)
    checkCommonTags(result.common)
  })

    .on('picture', function (result) {
      t.strictEqual(result[0].format, 'jpg', 'aliased picture format')
      t.strictEqual(result[0].data.length, 98008, 'aliased picture length')
    })

    // vorbis.tests
    .on('TITLE', function (result) {
      t.strictEqual(result, 'Sinner\'s Prayer', 'event vorbis.TITLE')
    })
    .on('ARTIST', function (result) {
      t.strictEqual(result, 'Beth Hart & Joe Bonamassa', 'event vorbis.ARTIST')
    })
    .on('ALBUM', function (result) {
      t.strictEqual(result, 'Don\'t Explain', 'event vorbis.TITLE')
    })
    .on('DATE', function (result) {
      t.strictEqual(result, '2011-09-27', 'event vorbis.DATE')
    })
    .on('TRACKNUMBER', function (result) {
      t.strictEqual(result, '1', 'event vorbis.TRACKNUMBER')
    })
    .on('DISCNUMBER', function (result) {
      t.strictEqual(result, '1', 'event vorbis.DISCNUMBER')
    })
    .on('PRODUCER', function (result) {
      t.strictEqual(result, 'Roy Weisman', 'event vorbis.PRODUCER')
    })
    .on('ENGINEER', function (result) {
      switch(countEngineer++) {
        case 0:
          t.strictEqual(result, 'James McCullagh', 'event vorbis.ENGINEER')
          break
        case 1:
          t.strictEqual(result, 'Jared Kvitka', 'event vorbis.ENGINEER')
          break
      }
    })
    .on('LABEL', function (result) {
      t.strictEqual(result, 'J&R Adventures', 'event vorbis.LABEL')
    })
    .on('CATALOGNUMBER', function (result) {
      t.strictEqual(result, 'PRAR931391', 'event vorbis.CATALOGNUMBER')
    })
    .on('ACOUSTID_ID', function (result) {
      t.strictEqual(result, '09c06fac-679a-45b1-8ea0-6ce532318363', 'event vorbis.ACOUSTID_ID')
    })
    .on('ARTIST', function (result) {
      t.strictEqual(result, 'Beth Hart & Joe Bonamassa', 'event vorbis.ARTIST')
    })
    .on('ALBUMARTIST', function (result) {
      t.strictEqual(result, 'Beth Hart & Joe Bonamassa', 'event vorbis.ALBUMARTIST')
    })
    .on('ALBUMARTISTSORT', function (result) {
      t.strictEqual(result, 'Hart, Beth & Bonamassa, Joe', 'event vorbis.ALBUMARTISTSORT')
    })
    .on('ORIGINALDATE', function (result) {
      t.strictEqual(result, '2011-09-26', 'event vorbis.ORIGINALDATE')
    })
    .on('SCRIPT', function (result) {
      t.strictEqual(result, 'Latn', 'event vorbis.SCRIPT')
    })
    .on('MEDIA', function (result) {
      t.strictEqual(result, 'CD', 'vorbis.MEDIA')
    })
    .on('MUSICBRAINZ_ALBUMID', function (result) {
      t.strictEqual(result, 'e7050302-74e6-42e4-aba0-09efd5d431d8', 'event vorbis.MUSICBRAINZ_ALBUMID')
    })
    // Hart, Beth & Bonamassa, Joe
    .on('MUSICBRAINZ_ALBUMARTISTID', function (result) {
      switch(countMusicBrainzAlbumArtistId++) {
        case 0:
          t.strictEqual(result, '3fe817fc-966e-4ece-b00a-76be43e7e73c', 'event vorbis.MUSICBRAINZ_ALBUMARTISTID #1/2')
          break
        case 1:
          t.strictEqual(result, '984f8239-8fe1-4683-9c54-10ffb14439e9', 'event vorbis.MUSICBRAINZ_ALBUMARTISTID #2/2')
          break
      }
    })
    .on('MUSICBRAINZ_ARTISTID', function (result) {
      switch(countMusicBrainzArtistId++) {
        case 0:
          t.strictEqual(result, '3fe817fc-966e-4ece-b00a-76be43e7e73c', 'event vorbis.MUSICBRAINZ_ARTISTID #1/2')
          break
        case 1:
          t.strictEqual(result, '984f8239-8fe1-4683-9c54-10ffb14439e9', 'event vorbis.MUSICBRAINZ_ARTISTID #2/2')
          break
      }
    })
    .on('PERFORMER', function (result) {
      switch(countPerformer++) {
        case 0:
          t.strictEqual(result, 'Carmine Rojas (bass guitar)', 'event vorbis.PERFORMER')
          break
        case 1:
          t.strictEqual(result, 'The Bovaland Orchestra (orchestra)', 'event vorbis.PERFORMER')
          break
        case 2:
          t.strictEqual(result, 'Anton Fig (drums)', 'event vorbis.PERFORMER')
          break
        case 3:
          t.strictEqual(result, 'Anton Fig (percussion)', 'event vorbis.PERFORMER')
          break
        case 4:
          t.strictEqual(result, 'Blondie Chaplin (guitar)', 'event vorbis.PERFORMER')
          break
        case 5:
          t.strictEqual(result, 'Joe Bonamassa (guitar)', 'event vorbis.PERFORMER')
          break
        case 6:
          t.strictEqual(result, 'Arlan Scheirbaum (keyboard)', 'event vorbis.PERFORMER')
          break
        case 7:
          t.strictEqual(result, 'Beth Hart (vocals)', 'event vorbis.PERFORMER')
          break
        case 8:
          t.strictEqual(result, 'Joe Bonamassa (vocals)', 'event vorbis.PERFORMER')
          break
        case 9:
          t.strictEqual(result, 'Beth Hart (piano)', 'event vorbis.PERFORMER')
          break
      }
    })
    .on('MUSICBRAINZ_ALBUMID', function (result) {
      t.strictEqual(result, 'e7050302-74e6-42e4-aba0-09efd5d431d8', 'event vorbis.MUSICBRAINZ_ALBUMID')
    })
    .on('MUSICBRAINZ_RELEASETRACKID', function (result) {
      t.strictEqual(result, 'd062f484-253c-374b-85f7-89aab45551c7', 'event vorbis.MUSICBRAINZ_RELEASETRACKID')
    })
    .on('MUSICBRAINZ_RELEASEGROUPID', function (result) {
      t.strictEqual(result, 'e00305af-1c72-469b-9a7c-6dc665ca9adc', 'event vorbis.MUSICBRAINZ_RELEASEGROUPID')
    })
    .on('METADATA_BLOCK_PICTURE', function (result) {
      t.strictEqual(result.format, 'image/jpeg', 'event vorbis.METADATA_BLOCK_PICTURE format')
      t.strictEqual(result.description, '', 'event vorbis.METADATA_BLOCK_PICTURE description')
      t.strictEqual(result.data.length, 98008, 'event vorbis.METADATA_BLOCK_PICTURE length')
    })
    .on('MUSICBRAINZ_TRACKID', function (result) {
      t.strictEqual(result, 'f151cb94-c909-46a8-ad99-fb77391abfb8', 'event vorbis.MUSICBRAINZ_TRACKID')
    })

})
