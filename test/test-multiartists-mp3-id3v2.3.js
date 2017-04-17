/* jshint maxlen: 140 */

var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test('Test multi-artists MP3-V0 ID3v2.3', function (t) {
  t.plan(61)

  var filename = 'MusicBrainz-multiartist [id3v2.3].V2.mp3'

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/' + filename)])
    : fs.createReadStream(path.join(__dirname, '/samples/' + filename))

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

  function checkID3Tags (id3v23) {

    t.deepEqual(id3v23.TIT2, 'Sinner\'s Prayer', 'id3v23.TIT2: Title/songname/content description')
    t.deepEqual(id3v23.TPE1, 'Beth Hart & Joe Bonamassa', 'id3v23.TPE1: Lead performer(s)/Soloist(s)')
    t.deepEqual(id3v23.TPE2, 'Beth Hart & Joe Bonamassa', 'id3v23.TPE1: Band/orchestra/accompaniment')
    t.deepEqual(id3v23.TALB, 'Don\'t Explain', 'id3v23.TALB: Album/Movie/Show title')
    t.deepEqual(id3v23.TORY, '2011', 'id3v23.TORY: Original release year')
    t.deepEqual(id3v23.TYER, '2011', 'id3v23.TYER')
    t.deepEqual(id3v23.TPOS, '1/1', 'id3v23.TPOS: Part of a set')
    t.deepEqual(id3v23.TRCK, '1/10', 'id3v23.TRCK: Track number/Position in set')
    t.deepEqual(id3v23.TPUB, 'J&R Adventures', 'id3v23.TPUB: Publisher')
    t.deepEqual(id3v23.TMED, 'CD', 'id3v23.TMED: Media type')
    //t.deepEqual(id3v23.UFID[0], {owner_identifier: 'http://musicbrainz.org', identifier: Buffer.from([102, 49, 53, 49, 99, 98, 57, 52, 45, 99, 57, 48, 57, 45, 52, 54, 97, 56, 45, 97, 100, 57, 57, 45, 102, 98, 55, 55, 51, 57, 49, 97, 98, 102, 98, 56])}, 'id3v23.UFID: Unique file identifier')
    t.deepEqual(id3v23.UFID[0], {owner_identifier: 'http://musicbrainz.org', identifier: new Buffer('f151cb94-c909-46a8-ad99-fb77391abfb8', 'ascii')}, 'id3v23.UFID: Unique file identifier')

    t.deepEqual(id3v23.IPLS, {
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
      vocals: [ 'Beth Hart', 'Joe Bonamassa' ] }, 'id3v23.IPLS: Involved people list')

    t.strictEqual(id3v23['TXXX:ASIN'], 'B004X5SCGM', 'id3v23.TXXX:ASIN')
    t.deepEqual(id3v23['TXXX:Artists'], ['Beth Hart', 'Joe Bonamassa'], 'id3v23.TXXX:Artists')
    t.strictEqual(id3v23['TXXX:BARCODE'], '804879313915', 'id3v23.TXXX:BARCODE')
    t.strictEqual(id3v23['TXXX:CATALOGNUMBER'], 'PRAR931391', 'id3v23.TXXX:CATALOGNUMBER')
    t.deepEqual(id3v23['TXXX:MusicBrainz Album Artist Id'], ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'id3v23.TXXX:MusicBrainz Album Artist Id')
    t.strictEqual(id3v23['TXXX:MusicBrainz Album Id'], 'e7050302-74e6-42e4-aba0-09efd5d431d8', 'id3v23.TXXX:MusicBrainz Album Id')
    // ToDo?? t.strictEqual(id3v23['TXXX:MusicBrainz Album Release Country'], 'GB', 'id3v23.TXXX:MusicBrainz Album Release Country')
    t.strictEqual(id3v23['TXXX:MusicBrainz Album Status'], 'official', 'id3v23.TXXX:MusicBrainz Album Status')
    t.deepEqual(id3v23['TXXX:MusicBrainz Album Type'], ['album'], 'id3v23.TXXX:MusicBrainz Album Type')
    t.deepEqual(id3v23['TXXX:MusicBrainz Artist Id'], ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'id3v23.TXXX:MusicBrainz Artist Id')
    t.strictEqual(id3v23['TXXX:MusicBrainz Release Group Id'], 'e00305af-1c72-469b-9a7c-6dc665ca9adc', 'id3v23.TXXX.MusicBrainz Release Group Id')
    t.strictEqual(id3v23['TXXX:MusicBrainz Release Track Id'], 'd062f484-253c-374b-85f7-89aab45551c7', 'id3v23.TXXX.MusicBrainz Release Track Id')
    t.strictEqual(id3v23['TXXX:SCRIPT'], 'Latn', 'id3v23.TXXX:SCRIPT')
    t.strictEqual(id3v23['TXXX:originalyear'], '2011', 'id3v23.TXXX:originalyear')
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

  // Run with default options
  mm.parseStream(sample, {native: true}, function (err, result) {
    t.error(err)
    t.ok(result.hasOwnProperty('id3v2.3'), 'should include native id3v2.3 tags')
    checkFormat(result.format)
    checkID3Tags(result['id3v2.3'])
    checkCommonTags(result.common)
  })

    .on('picture', function (result) {
      t.strictEqual(result[0].format, 'jpg', 'aliased picture format')
      t.strictEqual(result[0].data.length, 98008, 'aliased picture length')
    })

    // id3v23.tests
    .on('TITLE', function (result) {
      t.strictEqual(result, 'Sinner\'s Prayer', 'event id3v23.TITLE')
    })
    .on('ARTIST', function (result) {
      t.strictEqual(result, 'Beth Hart & Joe Bonamassa', 'event id3v23.ARTIST')
    })
    .on('ALBUM', function (result) {
      t.strictEqual(result, 'Don\'t Explain', 'event id3v23.TITLE')
    })
    .on('DATE', function (result) {
      t.strictEqual(result, '2011-09-27', 'event id3v23.DATE')
    })
    .on('TRACKNUMBER', function (result) {
      t.strictEqual(result, '1', 'event id3v23.TRACKNUMBER')
    })
    .on('DISCNUMBER', function (result) {
      t.strictEqual(result, '1', 'event id3v23.DISCNUMBER')
    })
    .on('PRODUCER', function (result) {
      t.strictEqual(result, 'Roy Weisman', 'event id3v23.PRODUCER')
    })
    .on('ENGINEER', function (result) {
      switch(countEngineer++) {
        case 0:
          t.strictEqual(result, 'James McCullagh', 'event id3v23.ENGINEER')
          break
        case 1:
          t.strictEqual(result, 'Jared Kvitka', 'event id3v23.ENGINEER')
          break
      }
    })
    .on('LABEL', function (result) {
      t.strictEqual(result, 'J&R Adventures', 'event id3v23.LABEL')
    })
    .on('CATALOGNUMBER', function (result) {
      t.strictEqual(result, 'PRAR931391', 'event id3v23.CATALOGNUMBER')
    })
    .on('ACOUSTID_ID', function (result) {
      t.strictEqual(result, '09c06fac-679a-45b1-8ea0-6ce532318363', 'event id3v23.ACOUSTID_ID')
    })
    .on('ARTIST', function (result) {
      t.strictEqual(result, 'Beth Hart & Joe Bonamassa', 'event id3v23.ARTIST')
    })
    .on('ALBUMARTIST', function (result) {
      t.strictEqual(result, 'Beth Hart & Joe Bonamassa', 'event id3v23.ALBUMARTIST')
    })
    .on('ALBUMARTISTSORT', function (result) {
      t.strictEqual(result, 'Hart, Beth & Bonamassa, Joe', 'event id3v23.ALBUMARTISTSORT')
    })
    .on('ORIGINALDATE', function (result) {
      t.strictEqual(result, '2011-09-26', 'event id3v23.ORIGINALDATE')
    })
    .on('SCRIPT', function (result) {
      t.strictEqual(result, 'Latn', 'event id3v23.SCRIPT')
    })
    .on('MEDIA', function (result) {
      t.strictEqual(result, 'CD', 'id3v23.MEDIA')
    })
    .on('MUSICBRAINZ_ALBUMID', function (result) {
      t.strictEqual(result, 'e7050302-74e6-42e4-aba0-09efd5d431d8', 'event id3v23.MUSICBRAINZ_ALBUMID')
    })
    // Hart, Beth & Bonamassa, Joe
    .on('MUSICBRAINZ_ALBUMARTISTID', function (result) {
      switch(countMusicBrainzAlbumArtistId++) {
        case 0:
          t.strictEqual(result, '3fe817fc-966e-4ece-b00a-76be43e7e73c', 'event id3v23.MUSICBRAINZ_ALBUMARTISTID #1/2')
          break
        case 1:
          t.strictEqual(result, '984f8239-8fe1-4683-9c54-10ffb14439e9', 'event id3v23.MUSICBRAINZ_ALBUMARTISTID #2/2')
          break
      }
    })
    .on('MUSICBRAINZ_ARTISTID', function (result) {
      switch(countMusicBrainzArtistId++) {
        case 0:
          t.strictEqual(result, '3fe817fc-966e-4ece-b00a-76be43e7e73c', 'event id3v23.MUSICBRAINZ_ARTISTID #1/2')
          break
        case 1:
          t.strictEqual(result, '984f8239-8fe1-4683-9c54-10ffb14439e9', 'event id3v23.MUSICBRAINZ_ARTISTID #2/2')
          break
      }
    })
    .on('TIPL', function (result) {
      // Involved people list
      switch(countPerformer++) {
        case 0:
          t.strictEqual(result, 'producer', 'event id3v23.PERFORMER')
          break
        case 1:
          t.strictEqual(result, '﻿Roy Weisman', 'event id3v23.PERFORMER')
          break
        case 2:
          t.strictEqual(result, '﻿engineer', 'event id3v23.PERFORMER')
          break
        case 3:
          t.strictEqual(result, 'Anton Fig (percussion)', 'event id3v23.PERFORMER')
          break
        case 4:
          t.strictEqual(result, 'Blondie Chaplin (guitar)', 'event id3v23.PERFORMER')
          break
        case 5:
          t.strictEqual(result, 'Joe Bonamassa (guitar)', 'event id3v23.PERFORMER')
          break
        case 6:
          t.strictEqual(result, 'Arlan Scheirbaum (keyboard)', 'event id3v23.PERFORMER')
          break
        case 7:
          t.strictEqual(result, 'Beth Hart (vocals)', 'event id3v23.PERFORMER')
          break
        case 8:
          t.strictEqual(result, 'Joe Bonamassa (vocals)', 'event id3v23.PERFORMER')
          break
        case 9:
          t.strictEqual(result, 'Beth Hart (piano)', 'event id3v23.PERFORMER')
          break
      }
    })
    .on('MUSICBRAINZ_ALBUMID', function (result) {
      t.strictEqual(result, 'e7050302-74e6-42e4-aba0-09efd5d431d8', 'event id3v23.MUSICBRAINZ_ALBUMID')
    })
    .on('MUSICBRAINZ_RELEASETRACKID', function (result) {
      t.strictEqual(result, 'd062f484-253c-374b-85f7-89aab45551c7', 'event id3v23.MUSICBRAINZ_RELEASETRACKID')
    })
    .on('MUSICBRAINZ_RELEASEGROUPID', function (result) {
      t.strictEqual(result, 'e00305af-1c72-469b-9a7c-6dc665ca9adc', 'event id3v23.MUSICBRAINZ_RELEASEGROUPID')
    })
    .on('METADATA_BLOCK_PICTURE', function (result) {
      t.strictEqual(result.format, 'image/jpeg', 'event id3v23.METADATA_BLOCK_PICTURE format')
      t.strictEqual(result.description, '', 'event id3v23.METADATA_BLOCK_PICTURE description')
      t.strictEqual(result.data.length, 98008, 'event id3v23.METADATA_BLOCK_PICTURE length')
    })
    .on('MUSICBRAINZ_TRACKID', function (result) {
      t.strictEqual(result, 'f151cb94-c909-46a8-ad99-fb77391abfb8', 'event id3v23.MUSICBRAINZ_TRACKID')
    })

})
