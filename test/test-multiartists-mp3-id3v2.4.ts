import {} from "mocha";
import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';

const t = assert;

it("should support multiple artists in id3v2.4 header", () => {

  const filename = 'MusicBrainz-multiartist [id3v2.4].V2.mp3';
  const filePath = path.join(__dirname, 'samples', filename);

  function checkFormat(format: mm.IFormat) {
    t.strictEqual(format.headerType, 'id3v2.4', 'format.headerType');
    t.strictEqual(format.dataformat, 'mp3', 'format.dataformat = mp3');
    t.strictEqual(format.duration, 2, 'format.duration'); // ToDo: add fraction
    t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
    // t.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample');
    t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
    t.strictEqual(format.codecProfile, 'V2', 'format.codecProfile = V2');
    t.strictEqual(format.encoder, 'LAME3.99r', 'format.encoder = LAME3.99r');
  }

  function checkCommonTags(common) {
    // Compare expectedCommonTags with result.common
    t.strictEqual(common.title, 'Sinner\'s Prayer', 'common.tagtitle');
    t.strictEqual(common.artist, 'Beth Hart & Joe Bonamassa', 'common.artist');
    t.deepEqual(common.artists, ['Beth Hart', 'Joe Bonamassa'], 'common.artists');
    t.strictEqual(common.albumartist, 'Beth Hart & Joe Bonamassa', 'common.albumartist');
    t.deepEqual(common.albumartistsort, 'Hart, Beth & Bonamassa, Joe', 'common.albumsort');
    t.strictEqual(common.album, 'Don\'t Explain', 'common.album = Don\'t Explain');
    t.deepEqual(common.track, {no: 1, of: 10}, 'common.track');
    t.deepEqual(common.disk, {no: 1, of: 1}, 'common.disk');
    t.strictEqual(common.originaldate, '2011-09-26', 'common.originaldate = 2011-09-26');
    t.strictEqual(common.date, '2011-09-27', 'common.date');
    t.strictEqual(common.year, 2011, 'common.year');
    t.strictEqual(common.originalyear, 2011, 'common.year');
    t.strictEqual(common.media, 'CD', 'common.media = CD');
    t.strictEqual(common.barcode, 804879313915, 'common.barcode');
    // ToDo?? t.deepEqual(common.producer, ['Roy Weisman'], 'common.producer = Roy Weisman')
    t.strictEqual(common.label, 'J&R Adventures', 'common.label = J&R Adventures');
    t.strictEqual(common.catalognumber, 'PRAR931391', 'common.catalognumber = PRAR931391');
    t.strictEqual(common.originalyear, 2011, 'common.originalyear = 2011');
    t.strictEqual(common.releasestatus, 'official', 'common.releasestatus = official');
    t.deepEqual(common.releasetype, ['album'], 'common.releasetype');
    // t.deepEqual(common.notes, ['Medieval CUE Splitter (www.medieval.it)'], 'common.note')
    t.strictEqual(common.musicbrainz_albumid, 'e7050302-74e6-42e4-aba0-09efd5d431d8', 'common.musicbrainz_albumid');
    t.strictEqual(common.musicbrainz_recordingid, 'f151cb94-c909-46a8-ad99-fb77391abfb8', 'common.musicbrainz_recordingid');
    t.deepEqual(common.musicbrainz_albumartistid, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'common.musicbrainz_albumartistid');
    t.deepEqual(common.musicbrainz_artistid, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'common.musicbrainz_artistid');
    t.strictEqual(common.musicbrainz_releasegroupid, 'e00305af-1c72-469b-9a7c-6dc665ca9adc', 'common.musicbrainz_releasegroupid');
    t.strictEqual(common.musicbrainz_trackid, 'd062f484-253c-374b-85f7-89aab45551c7', 'common.musicbrainz_trackid');

    t.strictEqual(common.picture[0].format, 'jpg', 'picture format');
    t.strictEqual(common.picture[0].data.length, 98008, 'picture length');
  }

  function checkID3Tags(id3v24: mm.INativeTagDict) {

    t.deepEqual(id3v24.APIC[0].data.length, 98008, 'id3v24.APIC.data.length');
    t.deepEqual(id3v24.APIC[0].description, '', 'id3v24.APIC.data.description');
    t.deepEqual(id3v24.APIC[0].format, 'image/jpeg', 'id3v24.APIC.format = image/jpeg');
    t.deepEqual(id3v24.APIC[0].type, 'Cover (front)', 'd3v24.APIC.type = Cover (front)');

    t.deepEqual(id3v24.TALB, ['Don\'t Explain'], 'id3v24.TALB: Album/Movie/Show title');
    t.deepEqual(id3v24.TDOR, ['2011-09-26'], 'id3v24.TDOR');
    t.deepEqual(id3v24.TDRC, ['2011-09-27'], 'id3v24.DATE');

    t.deepEqual(id3v24.TIPL[0], {
      arranger: ['Jeff Bova'],
      engineer: ['James McCullagh', 'Jared Kvitka'],
      producer: ['Roy Weisman']
    }, 'event id3v24.TIPL');

    t.deepEqual(id3v24.TIT2[0], 'Sinner\'s Prayer', 'id3v24.TIT2: Title/songname/content description');

    t.deepEqual(id3v24.TMCL[0], {
      'bass guitar': ['Carmine Rojas'],
      drums: ['Anton Fig'],
      guitar: ['Blondie Chaplin', 'Joe Bonamassa'],
      keyboard: ['Arlan Scheirbaum'],
      orchestra: ['The Bovaland Orchestra'],
      percussion: ['Anton Fig'],
      piano: ['Beth Hart'],
      vocals: ['Beth Hart', 'Joe Bonamassa']
    }, 'event id3v24.TMCL');

    // Lead performer(s)/Soloist(s)
    t.deepEqual(id3v24.TMED, ['CD'], 'id3v24.TMED');
    t.deepEqual(id3v24.TPE1, ['Beth Hart & Joe Bonamassa'], 'id3v24.TPE1: Lead performer(s)/Soloist(s)');
    t.deepEqual(id3v24.TPE2, ['Beth Hart & Joe Bonamassa'], 'id3v24.TPE1: Band/orchestra/accompaniment');
    t.deepEqual(id3v24.TPOS, ['1/1'], 'id3v24.TPOS');
    t.deepEqual(id3v24.TPUB, ['J&R Adventures'], 'id3v24.TPUB');
    t.deepEqual(id3v24.TRCK, ['1/10'], 'id3v24.TRCK');

    t.deepEqual(id3v24.TSO2, ['Hart, Beth & Bonamassa, Joe'], 'TSO2');
    t.deepEqual(id3v24.TSOP, ['Hart, Beth & Bonamassa, Joe'], 'TSOP');

    t.deepEqual(id3v24.UFID[0], {
      owner_identifier: 'http://musicbrainz.org',
      identifier: new Buffer('f151cb94-c909-46a8-ad99-fb77391abfb8', 'ascii')
    }, 'id3v24.UFID: Unique file identifier');

    t.deepEqual(id3v24['TXXX:ASIN'], ['B004X5SCGM'], 'id3v24.TXXX:ASIN');
    t.deepEqual(id3v24['TXXX:Artists'], ['Beth Hart', 'Joe Bonamassa'], 'id3v24.TXXX:Artists');
    t.deepEqual(id3v24['TXXX:BARCODE'], ['804879313915'], 'id3v24.TXXX:BARCODE');
    t.deepEqual(id3v24['TXXX:CATALOGNUMBER'], ['PRAR931391'], 'id3v24.TXXX:CATALOGNUMBER');
    t.deepEqual(id3v24['TXXX:MusicBrainz Album Artist Id'], ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'id3v24.TXXX:MusicBrainz Album Artist Id');
    t.deepEqual(id3v24['TXXX:MusicBrainz Album Id'], ['e7050302-74e6-42e4-aba0-09efd5d431d8'], 'id3v24.TXXX:MusicBrainz Album Id');
    // ToDo?? t.deepEqual(id3v24['TXXX:MusicBrainz Album Release Country'], 'GB', 'id3v24.TXXX:MusicBrainz Album Release Country');
    t.deepEqual(id3v24['TXXX:MusicBrainz Album Status'], ['official'], 'id3v24.TXXX:MusicBrainz Album Status');
    t.deepEqual(id3v24['TXXX:MusicBrainz Album Type'], ['album'], 'id3v24.TXXX:MusicBrainz Album Type');
    t.deepEqual(id3v24['TXXX:MusicBrainz Artist Id'], ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'id3v24.TXXX:MusicBrainz Artist Id');
    t.deepEqual(id3v24['TXXX:MusicBrainz Release Group Id'], ['e00305af-1c72-469b-9a7c-6dc665ca9adc'], 'id3v24.TXXX.MusicBrainz Release Group Id');
    t.deepEqual(id3v24['TXXX:MusicBrainz Release Track Id'], ['d062f484-253c-374b-85f7-89aab45551c7'], 'id3v24.TXXX.MusicBrainz Release Track Id');
    t.deepEqual(id3v24['TXXX:SCRIPT'], ['Latn'], 'id3v24.TXXX:SCRIPT');
    t.deepEqual(id3v24['TXXX:originalyear'], ['2011'], 'id3v24.TXXX:originalyear');
  }

  // Run with default options
  return mm.parseFile(filePath).then((result) => {
    t.ok(result.native && result.native.hasOwnProperty('id3v2.4'), 'should include native id3v2.4 tags');
    checkFormat(result.format);
    checkID3Tags(mm.orderTags(result.native['id3v2.4']));
    checkCommonTags(result.common);
  });

});
