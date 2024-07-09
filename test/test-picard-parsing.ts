/* eslint-disable dot-notation, @typescript-eslint/dot-notation */
import { assert } from 'chai';
import path from 'node:path';
import * as crypto from 'crypto';

import { TagType } from '../lib/common/GenericTagTypes.js';
import { ICommonTagsResult, IFormat, INativeTagDict, parseFile, orderTags } from '../lib/index.js';
import { samplePath } from './util.js';

/**
 * Check if different header formats map to the same common output.
 * Ref: https://picard.musicbrainz.org/docs/mappings/
 */
describe('Parsing of metadata saved by \'Picard\' in audio files', () => {

  // Following function manage common mapping exceptions, for good or bad reasons

  function hasReleaseData(inputTagType: TagType): boolean {
    return inputTagType !== 'ID3v2.3';
  }

  function hasOriginalData(inputTagType: TagType): boolean {
    switch (inputTagType) {
      case 'ID3v2.3': // has original year, not the original date
        return false;
      default:
        return true;
    }
  }

  function calcHash(buf: Uint8Array): string {
    const hash = crypto.createHash('md5');
    hash.update(buf);
    return hash.digest('hex');
  }

  const performers = [
    'Carmine Rojas (bass guitar)',
    'The Bovaland Orchestra (orchestra)',
    'Anton Fig (drums)',
    'Blondie Chaplin (guitar)',
    'Joe Bonamassa (guitar)',
    'Anton Fig (percussion)',
    'Arlan Schierbaum (keyboard)',
    'Beth Hart (vocals)',
    'Joe Bonamassa (vocals)',
    'Beth Hart (piano)'
  ];

  /**
   * Check common output
   * @param inputTagType Meta-data header format
   * @param common Common tag mapping
   */
  function checkCommonMapping(inputTagType: TagType, common: ICommonTagsResult) {
    // Compare expectedCommonTags with result.common
    assert.strictEqual(common.title, 'Sinner\'s Prayer', inputTagType + ' => common.title');
    assert.strictEqual(common.artist, 'Beth Hart & Joe Bonamassa', inputTagType + ' => common.artist');

    if (inputTagType === 'asf') {
      assert.deepEqual(common.artists, ['Joe Bonamassa', 'Beth Hart'], inputTagType + ' => common.artists');
      assert.deepEqual(common.musicbrainz_artistid, ['984f8239-8fe1-4683-9c54-10ffb14439e9', '3fe817fc-966e-4ece-b00a-76be43e7e73c'], inputTagType + ' => common.musicbrainz_artistid');
    } else {
      assert.deepEqual(common.artists, ['Beth Hart', 'Joe Bonamassa'], inputTagType + ' => common.artists');
      assert.deepEqual(common.musicbrainz_artistid, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], inputTagType + ' => common.musicbrainz_artistid');
    }

    assert.strictEqual(common.albumartist, 'Beth Hart & Joe Bonamassa', 'common.albumartist'); // ToDo: this is not set
    assert.deepEqual(common.albumartistsort, 'Hart, Beth & Bonamassa, Joe', inputTagType + ' =>  common.albumartistsort');
    assert.strictEqual(common.album, 'Don\'t Explain', inputTagType + ' => common.album = Don\'t Explain');
    if (inputTagType === 'asf') {
      assert.deepEqual(common.track, {no: 1, of: null}, inputTagType + ' => common.track');
    } else {
      assert.deepEqual(common.track, {no: 1, of: 10}, inputTagType + ' => common.track');
    }
    assert.deepEqual(common.disk, {no: 1, of: 1}, inputTagType + ' => common.disk');
    if (hasOriginalData(inputTagType)) {
      assert.strictEqual(common.originaldate, '2011-09-26', inputTagType + ' => common.originaldate = 2011-09-26');
    }
    if (hasReleaseData(inputTagType)) {
      assert.strictEqual(common.date, '2011-09-27', inputTagType + ' => common.date');
    }
    assert.strictEqual(common.year, 2011, inputTagType + ' => common.year');
    assert.strictEqual(common.originalyear, 2011, inputTagType + ' => common.year');
    assert.strictEqual(common.media, 'CD', inputTagType + ' => common.media = CD');
    assert.strictEqual(common.barcode, '804879313915', inputTagType + ' => common.barcode');
    // ToDo?? assert.deepEqual(common.producer, ['Roy Weisman'], 'common.producer = Roy Weisman')
    assert.deepEqual(common.label, ['J&R Adventures'], inputTagType + ' => common.label = \'J&R Adventures\'');
    assert.deepEqual(common.catalognumber, ['PRAR931391'], inputTagType + ' => common.catalognumber = PRAR931391');
    assert.strictEqual(common.originalyear, 2011, inputTagType + ' => common.originalyear = 2011');
    assert.strictEqual(common.releasestatus, 'official', inputTagType + ' => common.releasestatus = official');
    assert.deepEqual(common.releasetype, ['album'], inputTagType + ' => common.releasetype');
    assert.strictEqual(common.musicbrainz_albumid, 'e7050302-74e6-42e4-aba0-09efd5d431d8', inputTagType + ' => common.musicbrainz_albumid');
    assert.strictEqual(common.musicbrainz_recordingid, 'f151cb94-c909-46a8-ad99-fb77391abfb8', inputTagType + ' => common.musicbrainz_recordingid');

    if (inputTagType === 'asf') {
      assert.deepEqual(common.musicbrainz_albumartistid, ['984f8239-8fe1-4683-9c54-10ffb14439e9', '3fe817fc-966e-4ece-b00a-76be43e7e73c'], inputTagType + ' => common.musicbrainz_albumartistid');
    } else {
      assert.deepEqual(common.musicbrainz_albumartistid, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], inputTagType + ' => common.musicbrainz_albumartistid');
    }

    assert.strictEqual(common.musicbrainz_releasegroupid, 'e00305af-1c72-469b-9a7c-6dc665ca9adc', inputTagType + ' => common.musicbrainz_releasegroupid');
    assert.strictEqual(common.musicbrainz_trackid, 'd062f484-253c-374b-85f7-89aab45551c7', inputTagType + ' => common.musicbrainz_trackid');
    assert.strictEqual(common.asin, 'B005NPEUB2', inputTagType + ' => common.asin');
    assert.strictEqual(common.acoustid_id, '09c06fac-679a-45b1-8ea0-6ce532318363', inputTagType + ' => common.acoustid_id');

    // Check front cover
    assert.strictEqual(common.picture[0].format, 'image/jpeg', 'picture format');
    assert.strictEqual(common.picture[0].data.length, 98008, 'picture length');
    assert.strictEqual(calcHash(common.picture[0].data), 'c57bec49b36ebf422018f82273d1995a', 'hash front cover data');

    // Check back cover
    assert.strictEqual(common.picture[1].format, 'image/png', 'picture format');
    assert.strictEqual(common.picture[1].data.length, 120291, 'picture length');
    assert.strictEqual(calcHash(common.picture[1].data), '90ec686eb82e745e737b2c7aa706eeaa', 'hash back cover data');

    // ISRC
    assert.deepEqual(common.isrc, ['NLB931100460', 'USMH51100098'], 'ISRC\'s');

    // Rating
    switch (inputTagType) {

      case 'APEv2':
      case 'iTunes':
        break; // Skip rating tests for mapping type

      default:
        assert.isDefined(common.rating, `'${inputTagType}' has rating`);
        assert.approximately(common.rating[0].rating, 0.6, 0.1, `'${inputTagType}': rating=3.0`);
    }
  }

  describe('Vorbis mappings', () => {

    /**
     * Check native Vorbis header
     * @param vorbis Vorbis native tags
     */
    function checkVorbisTags(vorbis: INativeTagDict) {
      // Compare expectedCommonTags with result.common
      assert.deepEqual(vorbis.TITLE, ['Sinner\'s Prayer'], 'vorbis.TITLE');
      assert.deepEqual(vorbis.ALBUM, ['Don\'t Explain'], 'vorbis.TITLE');
      assert.deepEqual(vorbis.DATE, ['2011-09-27'], 'vorbis.DATE');
      assert.deepEqual(vorbis.TRACKNUMBER, ['1'], 'vorbis.TRACKNUMBER');
      assert.deepEqual(vorbis.PRODUCER, ['Roy Weisman'], 'vorbis.PRODUCER');
      assert.deepEqual(vorbis.ENGINEER, ['James McCullagh', 'Jared Kvitka'], 'vorbis.ENGINEER');
      assert.deepEqual(vorbis.LABEL, ['J&R Adventures'], 'vorbis.LABEL');
      assert.deepEqual(vorbis.CATALOGNUMBER, ['PRAR931391'], 'vorbis.CATALOGNUMBER');
      assert.deepEqual(vorbis.ACOUSTID_ID, ['09c06fac-679a-45b1-8ea0-6ce532318363'], 'vorbis.ACOUSTID_ID');
      assert.deepEqual(vorbis.ARTIST, ['Beth Hart & Joe Bonamassa'], 'vorbis.ARTIST');
      assert.deepEqual(vorbis.ARTISTS, ['Beth Hart', 'Joe Bonamassa'], 'vorbis.ARTISTS');
      assert.deepEqual(vorbis.ARTISTSORT, ['Hart, Beth & Bonamassa, Joe'], 'vorbis.ARTISTSORT');
      assert.deepEqual(vorbis.ALBUMARTIST, ['Beth Hart & Joe Bonamassa'], 'vorbis.ALBUMARTIST');
      assert.deepEqual(vorbis.ALBUMARTISTSORT, ['Hart, Beth & Bonamassa, Joe'], 'vorbis.ALBUMARTISTSORT');
      assert.deepEqual(vorbis.ORIGINALDATE, ['2011-09-26'], 'vorbis.ORIGINALDATE');
      assert.deepEqual(vorbis.SCRIPT, ['Latn'], 'vorbis.SCRIPT');
      assert.deepEqual(vorbis.MEDIA, ['CD'], 'vorbis.MEDIA');
      assert.deepEqual(vorbis.MUSICBRAINZ_ALBUMID, ['e7050302-74e6-42e4-aba0-09efd5d431d8'], 'vorbis.MUSICBRAINZ_ALBUMID');
      assert.deepEqual(vorbis.MUSICBRAINZ_ALBUMARTISTID, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'vorbis.MUSICBRAINZ_ALBUMARTISTID');
      assert.deepEqual(vorbis.MUSICBRAINZ_ARTISTID, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'vorbis.MUSICBRAINZ_ARTISTID');
      assert.deepEqual(vorbis.PERFORMER, performers, 'vorbis.PERFORMER');
      assert.deepEqual(vorbis.ARRANGER, ['Jeff Bova'], 'vorbis.ARRANGER');
      assert.deepEqual(vorbis.MUSICBRAINZ_ALBUMID, ['e7050302-74e6-42e4-aba0-09efd5d431d8'], 'vorbis.MUSICBRAINZ_ALBUMID');
      assert.deepEqual(vorbis.MUSICBRAINZ_RELEASETRACKID, ['d062f484-253c-374b-85f7-89aab45551c7'], 'vorbis.MUSICBRAINZ_RELEASETRACKID');
      assert.deepEqual(vorbis.MUSICBRAINZ_RELEASEGROUPID, ['e00305af-1c72-469b-9a7c-6dc665ca9adc'], 'vorbis.MUSICBRAINZ_RELEASEGROUPID');
      assert.deepEqual(vorbis.MUSICBRAINZ_TRACKID, ['f151cb94-c909-46a8-ad99-fb77391abfb8'], 'vorbis.MUSICBRAINZ_TRACKID');
      assert.deepEqual(vorbis.NOTES, ['Medieval CUE Splitter (www.medieval.it)'], 'vorbis.NOTES');
      assert.deepEqual(vorbis.BARCODE, ['804879313915'], 'vorbis.BARCODE');
      assert.deepEqual(vorbis.ASIN, ['B005NPEUB2'], 'vorbis.ASIN');
      assert.deepEqual(vorbis.RELEASECOUNTRY, ['US'], 'vorbis.RELEASECOUNTRY');
      assert.deepEqual(vorbis.RELEASESTATUS, ['official'], 'vorbis.RELEASESTATUS');

      assert.strictEqual(vorbis.METADATA_BLOCK_PICTURE[0].format, 'image/jpeg', 'vorbis.METADATA_BLOCK_PICTURE.format = \'image/jpeg\'');
      assert.strictEqual(vorbis.METADATA_BLOCK_PICTURE[0].type, 'Cover (front)', 'vorbis.METADATA_BLOCK_PICTURE.type = \'Cover (front)\''); // ToDo: description??

      assert.strictEqual(vorbis.METADATA_BLOCK_PICTURE[0].description, '', 'vorbis.METADATA_BLOCK_PICTURE.description');
      assert.strictEqual(vorbis.METADATA_BLOCK_PICTURE[0].data.length, 98008, 'vorbis.METADATA_BLOCK_PICTURE.data.length = 98008 bytes');
      assert.strictEqual(calcHash(vorbis.METADATA_BLOCK_PICTURE[0].data), 'c57bec49b36ebf422018f82273d1995a', 'Picture content');
    }

    it('should map FLAC/Vorbis', async () => {

      const filename = 'MusicBrainz - Beth Hart - Sinner\'s Prayer.flac';

      function checkFormat(format) {
        assert.strictEqual(format.container, 'FLAC', 'format.container');
        assert.strictEqual(format.codec, 'FLAC', 'format.codec');
        assert.strictEqual(format.duration, 2.1229931972789116, 'format.duration = 2.123 seconds');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44100 samples/sec');
        assert.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample = 16 bits');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 channels');
      }

      // Parse flac/Vorbis file
      const metadata = await parseFile(path.join(samplePath, filename));
      assert.isDefined(metadata, 'should return metadata');
      assert.isDefined(metadata.native, 'should return metadata.native');
      assert.isDefined(metadata.native.vorbis, 'should return metadata.native.vorbis');
      checkFormat(metadata.format);
      checkVorbisTags(orderTags(metadata.native.vorbis));
      checkCommonMapping('vorbis', metadata.common);
    });

    it('should map ogg/Vorbis', async () => {

      const filePath = path.join(samplePath, 'MusicBrainz - Beth Hart - Sinner\'s Prayer.ogg');

      // Parse ogg/Vorbis file
      const metadata = await parseFile(filePath);
      assert.isDefined(metadata, 'should return metadata');
      assert.isDefined(metadata.native, 'should return metadata.native');
      assert.isDefined(metadata.native.vorbis, 'should return metadata.native.vorbis');
      // Check Vorbis native tags
      checkVorbisTags(orderTags(metadata.native.vorbis));
      // Check common mappings
      checkCommonMapping('vorbis', metadata.common);
    });

  });

  describe('APEv2 header', () => {

    function checkApeTags(APEv2: INativeTagDict) {
      // Compare expectedCommonTags with result.common
      assert.deepEqual(APEv2.Title, ['Sinner\'s Prayer'], 'APEv2.Title');
      assert.deepEqual(APEv2.Album, ['Don\'t Explain'], 'APEv2.Album');
      assert.deepEqual(APEv2.Year, ['2011-09-27'], 'APEv2.Year');
      assert.deepEqual(APEv2.Track, ['1/10'], 'APEv2.Track');
      assert.deepEqual(APEv2.Disc, ['1/1'], 'APEv2.Disc');
      assert.deepEqual(APEv2.Originalyear, ['2011'], 'APEv2.Year');
      assert.deepEqual(APEv2.Originaldate, ['2011-09-26'], 'APEv2.Originaldate');
      assert.deepEqual(APEv2.Label, ['J&R Adventures'], 'APEv2.LABEL');
      assert.deepEqual(APEv2.CatalogNumber, ['PRAR931391'], 'APEv2.CatalogNumber');
      assert.deepEqual(APEv2.Acoustid_Id, ['09c06fac-679a-45b1-8ea0-6ce532318363'], 'APEv2.Acoustid_Id');
      assert.deepEqual(APEv2.Artist, ['Beth Hart & Joe Bonamassa'], 'APEv2.Artist');
      assert.deepEqual(APEv2.Artists, ['Beth Hart', 'Joe Bonamassa'], 'APEv2.Artists');
      assert.deepEqual(APEv2.Artistsort, ['Hart, Beth & Bonamassa, Joe'], 'APEv2.Artistsort');
      assert.deepEqual(APEv2['Album Artist'], ['Beth Hart & Joe Bonamassa'], 'APEv2.ALBUMARTIST');
      assert.deepEqual(APEv2.Albumartistsort, ['Hart, Beth & Bonamassa, Joe'], 'APEv2.Albumartistsort');
      assert.deepEqual(APEv2.Originaldate, ['2011-09-26'], 'APEv2.ORIGINALDATE');
      assert.deepEqual(APEv2.Script, ['Latn'], 'APEv2.Script');
      assert.deepEqual(APEv2.Media, ['CD'], 'APEv2.Media');
      assert.deepEqual(APEv2.Musicbrainz_Albumid, ['e7050302-74e6-42e4-aba0-09efd5d431d8'], 'APEv2.Musicbrainz_Albumid');
      assert.deepEqual(APEv2.Musicbrainz_Albumartistid, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'APEv2.Musicbrainz_Albumartistid');
      assert.deepEqual(APEv2.Musicbrainz_Artistid, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'APEv2.Musicbrainz_Artistid');

      assert.deepEqual(APEv2.Performer, performers, 'APEv2.Performer');
      assert.deepEqual(APEv2.Producer, ['Roy Weisman'], 'APEv2.PRODUCER');
      assert.deepEqual(APEv2.Engineer, ['James McCullagh', 'Jared Kvitka'], 'APEv2.ENGINEER');
      assert.deepEqual(APEv2.Arranger, ['Jeff Bova'], 'APEv2.ARRANGER');

      assert.deepEqual(APEv2.Musicbrainz_Albumid, ['e7050302-74e6-42e4-aba0-09efd5d431d8'], 'APEv2.Musicbrainz_Albumid');
      assert.deepEqual(APEv2.musicbrainz_releasetrackid, ['d062f484-253c-374b-85f7-89aab45551c7'], 'APEv2.musicbrainz_releasetrackid');
      assert.deepEqual(APEv2.Musicbrainz_Releasegroupid, ['e00305af-1c72-469b-9a7c-6dc665ca9adc'], 'APEv2.Musicbrainz_Releasegroupid');
      assert.deepEqual(APEv2.musicbrainz_trackid, ['f151cb94-c909-46a8-ad99-fb77391abfb8'], 'APEv2.musicbrainz_trackid');

      // assert.deepEqual(APEv2.NOTES, ['Medieval CUE Splitter (www.medieval.it)'], 'APEv2.NOTES')
      assert.deepEqual(APEv2.Barcode, ['804879313915'], 'APEv2.Barcode');
      // ToDo: not set??? assert.deepEqual(APEv2.ASIN, 'B005NPEUB2', 'APEv2.ASIN');
      // ToDo: not set??? assert.deepEqual(APEv2.RELEASECOUNTRY, 'GB', 'APEv2.RELEASECOUNTRY');
      assert.deepEqual(APEv2.MUSICBRAINZ_ALBUMSTATUS, ['official'], 'APEv2.MUSICBRAINZ_ALBUMSTATUS');

      assert.deepEqual(APEv2.Arranger, ['Jeff Bova'], 'APEv2.Arranger');

      // ToDo:
      assert.deepEqual(APEv2['Cover Art (Front)'][0].format, 'image/jpeg', 'picture.format');
      assert.deepEqual(APEv2['Cover Art (Front)'][0].description, 'front', 'picture.description');
      assert.deepEqual(APEv2['Cover Art (Front)'][0].data.length, 98008, 'picture.data.length');

      assert.deepEqual(APEv2['Cover Art (Back)'][0].format, 'image/png', 'picture.format');
      assert.deepEqual(APEv2['Cover Art (Back)'][0].description, 'back', 'picture.description');
      assert.deepEqual(APEv2['Cover Art (Back)'][0].data.length, 120291, 'picture.data.length');
    }

    it('should map Monkey\'s Audio / APEv2', async () => {

      const filePath = path.join(samplePath, 'MusicBrainz - Beth Hart - Sinner\'s Prayer.ape');

      function checkFormat(format) {
        assert.strictEqual(format.duration, 2.1229931972789116, 'format.duration = 2.123 seconds');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
        assert.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
      }

      // Run with default options
      const metadata = await parseFile(filePath);
      assert.isDefined(metadata, 'should return metadata');
      assert.isDefined(metadata.native, 'should return metadata.native');
      assert.isDefined(metadata.native['APEv2'], 'should include native APEv2 tags');
      checkFormat(metadata.format);
      checkApeTags(orderTags(metadata.native.APEv2));
      checkCommonMapping('APEv2', metadata.common);
    });

    it('should map WavPack / APEv2', async () => {

      const filePath = path.join(samplePath, 'wavpack', 'MusicBrainz - Beth Hart - Sinner\'s Prayer.wv');

      function checkFormat(format) {
        assert.strictEqual(format.duration, 2.1229931972789116, 'format.duration = 2.123 seconds');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
        assert.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
      }

      // Run with default options
      const metadata = await parseFile(filePath);
      assert.isDefined(metadata, 'should return metadata');
      assert.isDefined(metadata.native, 'should return metadata.native');
      assert.isDefined(metadata.native['APEv2'], 'should include native APEv2 tags');
      checkFormat(metadata.format);
      checkApeTags(orderTags(metadata.native.APEv2));
      checkCommonMapping('APEv2', metadata.common);
    });

  });

  describe('ID3v2.3 header', () => {

    function checkID3Tags(native: INativeTagDict) {

      assert.deepEqual(native.TIT2, ['Sinner\'s Prayer'], 'id3v23.TIT2: Title/songname/content description');
      assert.deepEqual(native.TPE1, ['Beth Hart & Joe Bonamassa'], 'id3v23.TPE1: Lead performer(s)/Soloist(s)');
      assert.deepEqual(native.TPE2, ['Beth Hart & Joe Bonamassa'], 'id3v23.TPE2: Band/orchestra/accompaniment');
      assert.deepEqual(native.TALB, ['Don\'t Explain'], 'id3v23.TALB: Album/Movie/Show title');
      assert.deepEqual(native.TORY, ['2011'], 'id3v23.TORY: Original release year');
      assert.deepEqual(native.TYER, ['2011'], 'id3v23.TYER');
      assert.deepEqual(native.TPOS, ['1/1'], 'id3v23.TPOS: Part of a set');
      assert.deepEqual(native.TRCK, ['1/10'], 'id3v23.TRCK: Track number/Position in set');
      assert.deepEqual(native.TPUB, ['J&R Adventures'], 'id3v23.TPUB: Publisher');
      assert.deepEqual(native.TMED, ['CD'], 'id3v23.TMED: Media type');
      assert.deepEqual(native.UFID[0], {
        owner_identifier: 'http://musicbrainz.org',
        identifier: new TextEncoder().encode('f151cb94-c909-46a8-ad99-fb77391abfb8')
      }, 'id3v23.UFID: Unique file identifier');

      assert.deepEqual(native.IPLS, [{
        arranger: ['Jeff Bova'],
        'bass guitar': ['Carmine Rojas'],
        drums: ['Anton Fig'],
        engineer: ['James McCullagh', 'Jared Kvitka'],
        guitar: ['Blondie Chaplin', 'Joe Bonamassa'],
        keyboard: ['Arlan Schierbaum'],
        orchestra: ['The Bovaland Orchestra'],
        percussion: ['Anton Fig'],
        piano: ['Beth Hart'],
        producer: ['Roy Weisman'],
        vocals: ['Beth Hart', 'Joe Bonamassa']
      }], 'id3v23.IPLS: Involved people list');

      assert.deepEqual(native['TXXX:ASIN'], ['B005NPEUB2'], 'id3v23.TXXX:ASIN');
      assert.deepEqual(native['TXXX:Artists'], ['Beth Hart', 'Joe Bonamassa'], 'id3v23.TXXX:Artists');
      assert.deepEqual(native['TXXX:BARCODE'], ['804879313915'], 'id3v23.TXXX:BARCODE');
      assert.deepEqual(native['TXXX:CATALOGNUMBER'], ['PRAR931391'], 'id3v23.TXXX:CATALOGNUMBER');
      assert.deepEqual(native['TXXX:MusicBrainz Album Artist Id'], ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'id3v23.TXXX:MusicBrainz Album Artist Id');
      assert.deepEqual(native['TXXX:MusicBrainz Album Id'], ['e7050302-74e6-42e4-aba0-09efd5d431d8'], 'id3v23.TXXX:MusicBrainz Album Id');
      // ToDo?? assert.strictEqual(id3v23['TXXX:MusicBrainz Album Release Country'], 'GB', 'id3v23.TXXX:MusicBrainz Album Release Country')
      assert.deepEqual(native['TXXX:MusicBrainz Album Status'], ['official'], 'id3v23.TXXX:MusicBrainz Album Status');
      assert.deepEqual(native['TXXX:MusicBrainz Album Type'], ['album'], 'id3v23.TXXX:MusicBrainz Album Type');
      assert.deepEqual(native['TXXX:MusicBrainz Artist Id'], ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'id3v23.TXXX:MusicBrainz Artist Id');
      assert.deepEqual(native['TXXX:MusicBrainz Release Group Id'], ['e00305af-1c72-469b-9a7c-6dc665ca9adc'], 'id3v23.TXXX.MusicBrainz Release Group Id');
      assert.deepEqual(native['TXXX:MusicBrainz Release Track Id'], ['d062f484-253c-374b-85f7-89aab45551c7'], 'id3v23.TXXX.MusicBrainz Release Track Id');
      assert.deepEqual(native['TXXX:SCRIPT'], ['Latn'], 'id3v23.TXXX:SCRIPT');
      assert.deepEqual(native['TXXX:originalyear'], ['2011'], 'id3v23.TXXX:originalyear');
      // assert.strictEqual(native.METADATA_BLOCK_PICTURE.format, 'image/jpeg', 'native.METADATA_BLOCK_PICTURE format')
      // assert.strictEqual(native.METADATA_BLOCK_PICTURE.data.length, 98008, 'native.METADATA_BLOCK_PICTURE length')
    }

    it('MP3 / ID3v2.3', () => {

      const filePath = path.join(samplePath, 'MusicBrainz - Beth Hart - Sinner\'s Prayer [id3v2.3].V2.mp3');

      function checkFormat(format) {
        assert.deepEqual(format.tagTypes, ['ID3v2.3'], 'format.tagTypes');
        assert.deepEqual(format.container, 'MPEG', 'format.container');
        assert.deepEqual(format.codec, 'MPEG 1 Layer 3', 'format.codec');
        assert.strictEqual(format.duration, 2.1681632653061222, 'format.duration');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
        assert.strictEqual(format.codecProfile, 'V2', 'format.codecProfile');
        assert.strictEqual(format.tool, 'LAME 3.99r', 'format.tool');
      }

      // Run with default options
      return parseFile(filePath).then(metadata => {
        assert.isDefined(metadata, 'should return metadata');
        assert.isDefined(metadata.native, 'should return metadata.native');
        assert.isDefined(metadata.native['ID3v2.3'], 'should include native id3v2.3 tags');
        checkFormat(metadata.format);
        checkID3Tags(orderTags(metadata.native['ID3v2.3']));
        checkCommonMapping('ID3v2.3', metadata.common);
      });

    });

    /**
     * Looks like RIFF/WAV not fully supported yet in MusicBrainz Picard: https://tickets.metabrainz.org/browse/PICARD-653?jql=text%20~%20%22RIFF%22.
     * This file has been fixed with Mp3Tag to have a valid ID3v2.3 tag
     */
    it('should map RIFF/WAVE/PCM / ID3v2.3', () => {

      const filePath = path.join(samplePath, 'MusicBrainz - Beth Hart - Sinner\'s Prayer [id3v2.3].wav');

      function checkFormat(format: IFormat) {
        // assert.strictEqual(format.container, "WAVE", "format.container = WAVE PCM");
        assert.deepEqual(format.tagTypes, ['exif', 'ID3v2.3'], 'format.tagTypes)');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        assert.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample = 16 bits');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 channels');
        assert.strictEqual(format.numberOfSamples, 93624, 'format.numberOfSamples = 88200');
        assert.strictEqual(format.duration, 2.1229931972789116, 'format.duration = 2 seconds');
      }

      // Parse wma/asf file
      return parseFile(filePath).then(result => {
        // Check wma format
        checkFormat(result.format);
        // Check native tags
        checkID3Tags(orderTags(result.native['ID3v2.3']));
        checkCommonMapping('ID3v2.3', result.common);
      });

    });

  });

  describe('ID3v2.4 header', () => {

    function checkID3Tags(id3v24: INativeTagDict) {

      assert.deepEqual(id3v24.APIC[0].data.length, 98008, 'id3v24.APIC.data.length');
      assert.deepEqual(id3v24.APIC[0].description, '', 'id3v24.APIC.data.description');
      assert.deepEqual(id3v24.APIC[0].format, 'image/jpeg', 'id3v24.APIC.format = image/jpeg');
      assert.deepEqual(id3v24.APIC[0].type, 'Cover (front)', 'd3v24.APIC.type = Cover (front)');

      assert.deepEqual(id3v24.TALB, ['Don\'t Explain'], 'id3v24.TALB: Album/Movie/Show title');
      assert.deepEqual(id3v24.TDOR, ['2011-09-26'], 'id3v24.TDOR');
      assert.deepEqual(id3v24.TDRC, ['2011-09-27'], 'id3v24.DATE');

      assert.deepEqual(id3v24.TIPL[0], {
        arranger: ['Jeff Bova'],
        engineer: ['James McCullagh', 'Jared Kvitka'],
        producer: ['Roy Weisman']
      }, 'event id3v24.TIPL');

      assert.deepEqual(id3v24.TIT2[0], 'Sinner\'s Prayer', 'id3v24.TIT2: Title/songname/content description');

      assert.deepEqual(id3v24.TMCL[0], {
        'bass guitar': ['Carmine Rojas'],
        drums: ['Anton Fig'],
        guitar: ['Blondie Chaplin', 'Joe Bonamassa'],
        keyboard: ['Arlan Schierbaum'],
        orchestra: ['The Bovaland Orchestra'],
        percussion: ['Anton Fig'],
        piano: ['Beth Hart'],
        vocals: ['Beth Hart', 'Joe Bonamassa']
      }, 'event id3v24.TMCL');

      // Lead performer(s)/Soloist(s)
      assert.deepEqual(id3v24.TMED, ['CD'], 'id3v24.TMED');
      assert.deepEqual(id3v24.TPE1, ['Beth Hart & Joe Bonamassa'], 'id3v24.TPE1: Lead performer(s)/Soloist(s)');
      assert.deepEqual(id3v24.TPE2, ['Beth Hart & Joe Bonamassa'], 'id3v24.TPE1: Band/orchestra/accompaniment');
      assert.deepEqual(id3v24.TPOS, ['1/1'], 'id3v24.TPOS');
      assert.deepEqual(id3v24.TPUB, ['J&R Adventures'], 'id3v24.TPUB');
      assert.deepEqual(id3v24.TRCK, ['1/10'], 'id3v24.TRCK');

      assert.deepEqual(id3v24.TSO2, ['Hart, Beth & Bonamassa, Joe'], 'TSO2');
      assert.deepEqual(id3v24.TSOP, ['Hart, Beth & Bonamassa, Joe'], 'TSOP');

      assert.deepEqual(id3v24.UFID[0], {
        owner_identifier: 'http://musicbrainz.org',
        identifier: new TextEncoder().encode('f151cb94-c909-46a8-ad99-fb77391abfb8')
      }, 'id3v24.UFID: Unique file identifier');

      assert.deepEqual(id3v24['TXXX:ASIN'], ['B005NPEUB2'], 'id3v24.TXXX:ASIN');
      assert.deepEqual(id3v24['TXXX:Artists'], ['Beth Hart', 'Joe Bonamassa'], 'id3v24.TXXX:Artists');
      assert.deepEqual(id3v24['TXXX:BARCODE'], ['804879313915'], 'id3v24.TXXX:BARCODE');
      assert.deepEqual(id3v24['TXXX:CATALOGNUMBER'], ['PRAR931391'], 'id3v24.TXXX:CATALOGNUMBER');
      assert.deepEqual(id3v24['TXXX:MusicBrainz Album Artist Id'], ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'id3v24.TXXX:MusicBrainz Album Artist Id');
      assert.deepEqual(id3v24['TXXX:MusicBrainz Album Id'], ['e7050302-74e6-42e4-aba0-09efd5d431d8'], 'id3v24.TXXX:MusicBrainz Album Id');
      // ToDo?? assert.deepEqual(id3v24['TXXX:MusicBrainz Album Release Country'], 'GB', 'id3v24.TXXX:MusicBrainz Album Release Country');
      assert.deepEqual(id3v24['TXXX:MusicBrainz Album Status'], ['official'], 'id3v24.TXXX:MusicBrainz Album Status');
      assert.deepEqual(id3v24['TXXX:MusicBrainz Album Type'], ['album'], 'id3v24.TXXX:MusicBrainz Album Type');
      assert.deepEqual(id3v24['TXXX:MusicBrainz Artist Id'], ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'id3v24.TXXX:MusicBrainz Artist Id');
      assert.deepEqual(id3v24['TXXX:MusicBrainz Release Group Id'], ['e00305af-1c72-469b-9a7c-6dc665ca9adc'], 'id3v24.TXXX.MusicBrainz Release Group Id');
      assert.deepEqual(id3v24['TXXX:MusicBrainz Release Track Id'], ['d062f484-253c-374b-85f7-89aab45551c7'], 'id3v24.TXXX.MusicBrainz Release Track Id');
      assert.deepEqual(id3v24['TXXX:SCRIPT'], ['Latn'], 'id3v24.TXXX:SCRIPT');
      assert.deepEqual(id3v24['TXXX:originalyear'], ['2011'], 'id3v24.TXXX:originalyear');
    }

    it('should map MP3/ID3v2.4 header', async () => {

      const filePath = path.join(samplePath, 'MusicBrainz - Beth Hart - Sinner\'s Prayer [id3v2.4].V2.mp3');

      function checkFormat(format: IFormat) {
        assert.deepEqual(format.tagTypes, ['ID3v2.4'], 'format.tagTypes');
        assert.strictEqual(format.container, 'MPEG', 'format.container');
        assert.strictEqual(format.codec, 'MPEG 1 Layer 3', 'format.codec');
        assert.strictEqual(format.codecProfile, 'V2', 'format.codecProfile = V2');
        assert.strictEqual(format.tool, 'LAME 3.99r', 'format.tool');
        assert.strictEqual(format.duration, 2.1681632653061222, 'format.duration');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
      }

      // Run with default options
      const metadata = await parseFile(filePath);

      assert.isDefined(metadata, 'should return metadata');
      assert.isDefined(metadata.native, 'should return metadata.native');
      assert.isDefined(metadata.native['ID3v2.4'], 'should include native id3v2.4 tags');

      checkFormat(metadata.format);
      checkID3Tags(orderTags(metadata.native['ID3v2.4']));
      checkCommonMapping('ID3v2.4', metadata.common);
    });

    it('should parse AIFF/ID3v2.4 audio file', async () => {

      const filePath = path.join(samplePath, 'MusicBrainz - Beth Hart - Sinner\'s Prayer [id3v2.4].aiff');

      function checkFormat(format: IFormat) {
        assert.strictEqual(format.container, 'AIFF', 'format.container = \'AIFF\'');
        assert.deepEqual(format.tagTypes, ['ID3v2.4'], 'format.tagTypes = \'ID3v2.4\''); // ToDo
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        assert.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample = 16 bits');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 channels');
        assert.strictEqual(format.numberOfSamples, 93624, 'format.bitsPerSample = 93624');
        assert.strictEqual(format.duration, 2.1229931972789116, 'format.duration = ~2.123');
      }

      // Parse wma/asf file
      const metadata = await parseFile(filePath);
      assert.isDefined(metadata, 'should return metadata');
      assert.isDefined(metadata.native, 'should return metadata.native');
      assert.isDefined(metadata.native['ID3v2.4'], 'should include native id3v2.4 tags');
      // Check wma format
      checkFormat(metadata.format);
      // Check ID3v2.4 native tags
      checkID3Tags(orderTags(metadata.native['ID3v2.4']));
      // Check common tag mappings
      checkCommonMapping('ID3v2.4', metadata.common);
    });

  });

  it('should map M4A / (Apple) iTunes header', async () => {

    const filePath = path.join(samplePath, 'MusicBrainz - Beth Hart - Sinner\'s Prayer.m4a');

    function checkFormat(format: IFormat) {
      assert.deepEqual(format.tagTypes, ['iTunes'], 'format.tagTypes');
      assert.strictEqual(format.container, 'M4A/mp42/isom', 'format.container');
      assert.strictEqual(format.codec, 'ALAC', 'format.codec');
      assert.strictEqual(format.lossless, true, 'ALAC is a lossless format');
      assert.strictEqual(format.duration, 2.1229931972789116, 'format.duration');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
      // assert.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample'); // ToDo
      // assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels'); // ToDo
    }

    function checkCommonTags(common) {
      assert.strictEqual(common.picture[0].format, 'image/jpeg', 'picture format');
      assert.strictEqual(common.picture[0].data.length, 98008, 'picture length');
    }

    function check_iTunes_Tags(iTunes: INativeTagDict) {

      assert.deepEqual(iTunes['©nam'], ['Sinner\'s Prayer'], 'iTunes.©nam => common.title');
      assert.deepEqual(iTunes['©ART'], ['Beth Hart & Joe Bonamassa'], 'iTunes.@ART => common.artist');
      assert.deepEqual(iTunes['©alb'], ['Don\'t Explain'], 'iTunes.©alb => common.album');
      assert.deepEqual(iTunes.soar, ['Hart, Beth & Bonamassa, Joe'], 'iTunes.soar => common.artistsort');
      assert.deepEqual(iTunes.soaa, ['Hart, Beth & Bonamassa, Joe'], 'iTunes.soaa => common.albumartistsort');
      assert.deepEqual(iTunes['----:com.apple.iTunes:ARTISTS'], ['Beth Hart', 'Joe Bonamassa'], 'iTunes.----:com.apple.iTunes:ARTISTS => common.artists');
      assert.deepEqual(iTunes.aART, ['Beth Hart & Joe Bonamassa'], 'iTunes.aART => common.albumartist');
      assert.deepEqual(iTunes['----:com.apple.iTunes:Band'], ['Beth Hart & Joe Bonamassa'], 'iTunes.----:com.apple.iTunes:Band => common.albumartist');
      assert.deepEqual(iTunes.trkn, ['1/10'], 'iTunes.trkn => common.track');
      assert.deepEqual(iTunes.disk, ['1/1'], 'iTunes.trkn => common.disk');
      assert.deepEqual(iTunes['----:com.apple.iTunes:ORIGINALDATE'], ['2011-09-26'], 'iTunes.----:com.apple.iTunes:ORIGINALDATE => common.albumartistsort');
      assert.deepEqual(iTunes['----:com.apple.iTunes:ORIGINALYEAR'], ['2011'], 'iTunes.----:com.apple.iTunes:ORIGINALDATE => common.originalyear');

      assert.deepEqual(iTunes['----:com.apple.iTunes:ACOUSTID_ID'], ['09c06fac-679a-45b1-8ea0-6ce532318363']);
      assert.deepEqual(iTunes['----:com.apple.iTunes:ARRANGER'], ['Jeff Bova']);

      assert.deepEqual(iTunes['----:com.apple.iTunes:NOTES'], ['Medieval CUE Splitter (www.medieval.it)']);
      // ToDO
    }

    // Run with default options
    const metadata = await parseFile(filePath);
    assert.isDefined(metadata, 'should return metadata');
    assert.isDefined(metadata.native, 'should return metadata.native');
    assert.isDefined(metadata.native.iTunes, 'should include native iTunes tags');

    checkFormat(metadata.format);
    check_iTunes_Tags(orderTags(metadata.native.iTunes));
    checkCommonTags(metadata.common);
    checkCommonMapping('iTunes', metadata.common);

  });

  it('should map WMA/ASF header', async () => {

    const filePath = path.join(samplePath, 'MusicBrainz - Beth Hart - Sinner\'s Prayer.wma');

    function checkFormat(format: IFormat) {
      assert.deepEqual(format.tagTypes, ['asf'], 'format.tagTypes = asf');
      assert.strictEqual(format.bitrate, 320000, 'format.bitrate = 320000');
      // ToDo assert.strictEqual(format.container, "wma", "format.container = wma");
      assert.approximately(format.duration, 2.135, 1 / 10000, "format.duration");
      // ToDo assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
      // ToDo assert.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample'); // ToDo
      // ToDo assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels'); // ToDo
    }

    function check_asf_Tags(native: INativeTagDict) {
      assert.deepEqual(native['WM/AlbumArtist'], ['Beth Hart & Joe Bonamassa'], 'asf.WM/AlbumArtist => common.albumartist = \'Beth Hart & Joe Bonamassa\'');
      assert.deepEqual(native['WM/AlbumTitle'], ['Don\'t Explain'], 'asf.WM/AlbumTitle => common.albumtitle = \'Don\'t Explain\'');
      assert.deepEqual(native['WM/ARTISTS'], ['Joe Bonamassa', 'Beth Hart'], 'asf.WM/ARTISTS => common.artists = [\'Joe Bonamassa\', \'Beth Hart\']');
      assert.isDefined(native['WM/Picture'], 'Contains WM/Picture');
      assert.strictEqual(native['WM/Picture'].length, 1, 'Contains 1 WM/Picture');
      // ToDO
    }

    // Parse wma/asf file
    const metadata = await parseFile(filePath);

    assert.isDefined(metadata, 'should return metadata');
    assert.isDefined(metadata.native, 'should return metadata.native');
    assert.isDefined(metadata.native.asf, 'should include native asf tags');

    // Check wma format
    checkFormat(metadata.format);
    // Check asf native tags
    check_asf_Tags(orderTags(metadata.native.asf));
    // Check common tag mappings
    // ToDo checkCommonMapping(result.format.tagTypes, result.common);
  });

});
