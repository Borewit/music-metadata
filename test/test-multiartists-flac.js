/* jshint maxlen: 140 */

var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test('Test multi-artists flac', function (t) {
  t.plan(72)

  var filename = 'MusicBrainz-multiartist.flac'
  var filePath = path.join(__dirname, 'samples', filename);

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
    t.strictEqual(common.barcode, 804879313915, 'common.barcode')
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
    t.deepEqual(vorbis.TITLE, ['Sinner\'s Prayer'], 'vorbis.TITLE')
    t.deepEqual(vorbis.ALBUM, ['Don\'t Explain'], 'vorbis.TITLE')
    t.deepEqual(vorbis.DATE, ['2011-09-27'], 'vorbis.DATE')
    t.deepEqual(vorbis.TRACKNUMBER, ['1'], 'vorbis.TRACKNUMBER')
    t.deepEqual(vorbis.PRODUCER, ['Roy Weisman'], 'vorbis.PRODUCER')
    t.deepEqual(vorbis.ENGINEER, ['James McCullagh', 'Jared Kvitka'], 'vorbis.ENGINEER')
    t.deepEqual(vorbis.LABEL, ['J&R Adventures'], 'vorbis.LABEL')
    t.deepEqual(vorbis.CATALOGNUMBER, ['PRAR931391'], 'vorbis.CATALOGNUMBER')
    t.deepEqual(vorbis.ACOUSTID_ID, ['09c06fac-679a-45b1-8ea0-6ce532318363'], 'vorbis.ACOUSTID_ID')
    t.deepEqual(vorbis.ARTIST, ['Beth Hart & Joe Bonamassa'], 'vorbis.ARTIST')
    t.deepEqual(vorbis.ARTISTS, ['Beth Hart', 'Joe Bonamassa'], 'vorbis.ARTISTS')
    t.deepEqual(vorbis.ARTISTSORT, ['Hart, Beth & Bonamassa, Joe'], 'vorbis.ARTISTSORT')
    t.deepEqual(vorbis.ALBUMARTIST, ['Beth Hart & Joe Bonamassa'], 'vorbis.ALBUMARTIST')
    t.deepEqual(vorbis.ALBUMARTISTSORT, ['Hart, Beth & Bonamassa, Joe'], 'vorbis.ALBUMARTISTSORT')
    t.deepEqual(vorbis.ORIGINALDATE, ['2011-09-26'], 'vorbis.ORIGINALDATE')
    t.deepEqual(vorbis.SCRIPT, ['Latn'], 'vorbis.SCRIPT')
    t.deepEqual(vorbis.MEDIA, ['CD'], 'vorbis.MEDIA')
    t.deepEqual(vorbis.MUSICBRAINZ_ALBUMID, ['e7050302-74e6-42e4-aba0-09efd5d431d8'], 'vorbis.MUSICBRAINZ_ALBUMID')
    t.deepEqual(vorbis.MUSICBRAINZ_ALBUMARTISTID, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'vorbis.MUSICBRAINZ_ALBUMARTISTID')
    t.deepEqual(vorbis.MUSICBRAINZ_ARTISTID, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'vorbis.MUSICBRAINZ_ARTISTID')
    t.deepEqual(vorbis.PERFORMER, ['Carmine Rojas (bass guitar)', 'The Bovaland Orchestra (orchestra)', 'Anton Fig (drums)', 'Anton Fig (percussion)', 'Blondie Chaplin (guitar)',
      'Joe Bonamassa (guitar)', 'Arlan Scheirbaum (keyboard)', 'Beth Hart (vocals)', 'Joe Bonamassa (vocals)', 'Beth Hart (piano)'], 'vorbis.PERFORMER')
    t.deepEqual(vorbis.ARRANGER, ['Jeff Bova'], 'vorbis.ARRANGER')
    t.deepEqual(vorbis.MUSICBRAINZ_ALBUMID, ['e7050302-74e6-42e4-aba0-09efd5d431d8'], 'vorbis.MUSICBRAINZ_ALBUMID')
    t.deepEqual(vorbis.MUSICBRAINZ_RELEASETRACKID, ['d062f484-253c-374b-85f7-89aab45551c7'], 'vorbis.MUSICBRAINZ_RELEASETRACKID')
    t.deepEqual(vorbis.MUSICBRAINZ_RELEASEGROUPID, ['e00305af-1c72-469b-9a7c-6dc665ca9adc'], 'vorbis.MUSICBRAINZ_RELEASEGROUPID')
    t.deepEqual(vorbis.MUSICBRAINZ_TRACKID, ['f151cb94-c909-46a8-ad99-fb77391abfb8'], 'vorbis.MUSICBRAINZ_TRACKID')
    t.deepEqual(vorbis.NOTES, ['Medieval CUE Splitter (www.medieval.it)'], 'vorbis.NOTES')
    t.deepEqual(vorbis.BARCODE, ['804879313915'], 'vorbis.BARCODE')
    t.deepEqual(vorbis.ASIN, ['B004X5SCGM'], 'vorbis.ASIN')
    t.deepEqual(vorbis.RELEASECOUNTRY, ['GB'], 'vorbis.RELEASECOUNTRY')
    t.deepEqual(vorbis.RELEASESTATUS, ['official'], 'vorbis.RELEASESTATUS')

    t.deepEqual(vorbis.METADATA_BLOCK_PICTURE[0].format, 'image/jpeg', 'vorbis.METADATA_BLOCK_PICTURE.format')
    t.deepEqual(vorbis.METADATA_BLOCK_PICTURE[0].type, 'Cover (front)', 'vorbis.METADATA_BLOCK_PICTURE.type') // ToDo: description??
    t.deepEqual(vorbis.METADATA_BLOCK_PICTURE[0].width, 0, 'vorbis.METADATA_BLOCK_PICTURE.width')
    t.deepEqual(vorbis.METADATA_BLOCK_PICTURE[0].height, 0, 'vorbis.METADATA_BLOCK_PICTURE.height')
    t.deepEqual(vorbis.METADATA_BLOCK_PICTURE[0].data.length, 98008, 'vorbis.METADATA_BLOCK_PICTURE.data.length')
    t.deepEqual(vorbis.METADATA_BLOCK_PICTURE[0].description, '', 'vorbis.METADATA_BLOCK_PICTURE.description')

  }

  var countMusicBrainzAlbumArtistId = 0
  var countMusicBrainzArtistId = 0
  var countEngineer = 0
  var countPerformer = 0

  function mapNativeTags (nativeTags) {
    var tags = {};
    nativeTags.forEach(function(tag) {
      (tags[tag.id] = (tags[tag.id] || [])).push(tag.value);
    })
    return tags;
  }

  // Run with default options
  mm.parseFile(filePath, {native: true}).then( function (result) {
    t.ok(result.native && result.native.vorbis, 'should include native Vorbis tags')
    checkFormat(result.format);
    checkVorbisTags(mapNativeTags(result.native.vorbis));
    checkCommonTags(result.common);
  }).catch( function(err) {
    t.error(err);
  });


})
