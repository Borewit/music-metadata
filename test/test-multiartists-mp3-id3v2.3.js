/* jshint maxlen: 140 */

var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test('Test multi-artists MP3-V0 ID3v2.3', function (t) {
  t.plan(58)

  var filename = 'MusicBrainz-multiartist [id3v2.3].V2.mp3'
  var filePath = path.join(__dirname, 'samples', filename);

  function checkFormat (format) {
    t.strictEqual(format.headerType, 'id3v2.3', 'format.headerType')
    t.strictEqual(format.dataformat, 'mp3', 'format.dataformat = mp3')
    t.strictEqual(format.duration, 2, 'format.duration = 2.123 sec') // ToDo, add fraction???
    t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz')
    //t.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample')
    t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels')
    t.strictEqual(format.codecProfile, 'V2', 'format.codecProfile = V2')
    t.strictEqual(format.encoder, 'LAME3.99r', 'format.encoder = LAME3.99r')
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
    t.strictEqual(common.originalyear, 2011, 'common.originalyear = 2011')
    t.strictEqual(common.year, 2011, 'common.year')
    t.strictEqual(common.media, 'CD', 'common.media = CD')
    t.strictEqual(common.barcode, 804879313915, 'common.barcode')
    // ToDo ?? t.deepEqual(common.producer, ['Roy Weisman'], 'common.producer = Roy Weisman')
    t.strictEqual(common.label, 'J&R Adventures', 'common.label = J&R Adventures')
    t.strictEqual(common.catalognumber, 'PRAR931391', 'common.catalognumber = PRAR931391')
    t.strictEqual(common.originalyear, 2011, 'common.originalyear = 2011')
    t.strictEqual(common.releasestatus, 'official', 'common.releasestatus = official')
    t.deepEqual(common.releasetype, ['album'], 'common.releasetype')
    // t.deepEqual(common.notes, ['Medieval CUE Splitter (www.medieval.it)'], 'common.note')
    t.strictEqual(common.musicbrainz_albumid, 'e7050302-74e6-42e4-aba0-09efd5d431d8', 'common.musicbrainz_albumid')
    t.strictEqual(common.musicbrainz_recordingid, 'f151cb94-c909-46a8-ad99-fb77391abfb8', 'common.musicbrainz_recordingid')
    t.deepEqual(common.musicbrainz_albumartistid, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'common.musicbrainz_albumartistid')
    t.deepEqual(common.musicbrainz_artistid, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'common.musicbrainz_artistid')
    t.strictEqual(common.musicbrainz_releasegroupid, 'e00305af-1c72-469b-9a7c-6dc665ca9adc', 'common.musicbrainz_releasegroupid')
    t.strictEqual(common.musicbrainz_trackid, 'd062f484-253c-374b-85f7-89aab45551c7', 'common.musicbrainz_trackid')

    t.strictEqual(common.picture[0].format, 'jpg', 'picture format')
    t.strictEqual(common.picture[0].data.length, 98008, 'picture length')
  }

  function checkID3Tags (native) {

    t.deepEqual(native.TIT2, ['Sinner\'s Prayer'], 'id3v23.TIT2: Title/songname/content description')
    t.deepEqual(native.TPE1, ['Beth Hart & Joe Bonamassa'], 'id3v23.TPE1: Lead performer(s)/Soloist(s)')
    t.deepEqual(native.TPE2, ['Beth Hart & Joe Bonamassa'], 'id3v23.TPE1: Band/orchestra/accompaniment')
    t.deepEqual(native.TALB, ['Don\'t Explain'], 'id3v23.TALB: Album/Movie/Show title')
    t.deepEqual(native.TORY, ['2011'], 'id3v23.TORY: Original release year')
    t.deepEqual(native.TYER, ['2011'], 'id3v23.TYER')
    t.deepEqual(native.TPOS, ['1/1'], 'id3v23.TPOS: Part of a set')
    t.deepEqual(native.TRCK, ['1/10'], 'id3v23.TRCK: Track number/Position in set')
    t.deepEqual(native.TPUB, ['J&R Adventures'], 'id3v23.TPUB: Publisher')
    t.deepEqual(native.TMED, ['CD'], 'id3v23.TMED: Media type')
    //t.deepEqual(id3v23.UFID[0], {owner_identifier: 'http://musicbrainz.org', identifier: Buffer.from([102, 49, 53, 49, 99, 98, 57, 52, 45, 99, 57, 48, 57, 45, 52, 54, 97, 56, 45, 97, 100, 57, 57, 45, 102, 98, 55, 55, 51, 57, 49, 97, 98, 102, 98, 56])}, 'id3v23.UFID: Unique file identifier')
    t.deepEqual(native.UFID[0], {owner_identifier: 'http://musicbrainz.org', identifier: new Buffer('f151cb94-c909-46a8-ad99-fb77391abfb8', 'ascii')}, 'id3v23.UFID: Unique file identifier')

    t.deepEqual(native.IPLS, [{
      arranger: [ 'Jeff Bova' ],
      'bass guitar': [ 'Carmine Rojas' ],
      drums: [ 'Anton Fig' ],
      engineer: [ 'James McCullagh', 'Jared Kvitka' ],
      guitar: [ 'Blondie Chaplin', 'Joe Bonamassa' ],
      keyboard: [ 'Arlan Scheirbaum' ],
      orchestra: [ 'The Bovaland Orchestra' ],
      percussion: [ 'Anton Fig' ],
      piano: [ 'Beth Hart' ],
      producer: [ 'Roy Weisman' ],
      vocals: [ 'Beth Hart', 'Joe Bonamassa' ] }], 'id3v23.IPLS: Involved people list')

    t.deepEqual(native['TXXX:ASIN'], ['B004X5SCGM'], 'id3v23.TXXX:ASIN')
    t.deepEqual(native['TXXX:Artists'], ['Beth Hart', 'Joe Bonamassa'], 'id3v23.TXXX:Artists')
    t.deepEqual(native['TXXX:BARCODE'], ['804879313915'], 'id3v23.TXXX:BARCODE')
    t.deepEqual(native['TXXX:CATALOGNUMBER'], ['PRAR931391'], 'id3v23.TXXX:CATALOGNUMBER')
    t.deepEqual(native['TXXX:MusicBrainz Album Artist Id'], ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'id3v23.TXXX:MusicBrainz Album Artist Id')
    t.deepEqual(native['TXXX:MusicBrainz Album Id'], ['e7050302-74e6-42e4-aba0-09efd5d431d8'], 'id3v23.TXXX:MusicBrainz Album Id')
    // ToDo?? t.strictEqual(id3v23['TXXX:MusicBrainz Album Release Country'], 'GB', 'id3v23.TXXX:MusicBrainz Album Release Country')
    t.deepEqual(native['TXXX:MusicBrainz Album Status'], ['official'], 'id3v23.TXXX:MusicBrainz Album Status')
    t.deepEqual(native['TXXX:MusicBrainz Album Type'], ['album'], 'id3v23.TXXX:MusicBrainz Album Type')
    t.deepEqual(native['TXXX:MusicBrainz Artist Id'], ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'id3v23.TXXX:MusicBrainz Artist Id')
    t.deepEqual(native['TXXX:MusicBrainz Release Group Id'], ['e00305af-1c72-469b-9a7c-6dc665ca9adc'], 'id3v23.TXXX.MusicBrainz Release Group Id')
    t.deepEqual(native['TXXX:MusicBrainz Release Track Id'], ['d062f484-253c-374b-85f7-89aab45551c7'], 'id3v23.TXXX.MusicBrainz Release Track Id')
    t.deepEqual(native['TXXX:SCRIPT'], ['Latn'], 'id3v23.TXXX:SCRIPT')
    t.deepEqual(native['TXXX:originalyear'], ['2011'], 'id3v23.TXXX:originalyear')
    //t.strictEqual(native.METADATA_BLOCK_PICTURE.format, 'image/jpeg', 'native.METADATA_BLOCK_PICTURE format')
    //t.strictEqual(native.METADATA_BLOCK_PICTURE.data.length, 98008, 'native.METADATA_BLOCK_PICTURE length')
  }

  function sortTXXX(txxxTags) {
    var res = {}
    for(var i=0; i<txxxTags.length; ++i) {
      res[txxxTags[i].description] = txxxTags[i].text
    }
    return res
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
  mm.parseFile(filePath).then(function (result) {
    t.ok(result.native && result.native.hasOwnProperty('id3v2.3'), 'should include native id3v2.3 tags')
    checkFormat(result.format)
    checkID3Tags(mapNativeTags(result.native['id3v2.3']))
    checkCommonTags(result.common)
  }).catch(function (err) {
    t.error(err, 'no error')
  });

})
