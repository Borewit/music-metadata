import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';
import * as crypto from "crypto";
import {TagType} from "../src/common/GenericTagTypes";
import {ICommonTagsResult, IFormat, INativeTagDict} from '../src/type';

const t = assert;

/**
 * Check if different header formats map to the same common output.
 * Ref: https://picard.musicbrainz.org/docs/mappings/
 */
describe("Parsing of metadata saved by 'Picard' in audio files", () => {

  const samplePath = path.join(__dirname, 'samples');

  // Following function manage common mapping exceptions, for good or bad reasons

  function hasReleaseData(inputTagType: TagType): boolean {
    switch (inputTagType) {
      case "ID3v2.3": // has original year, not the original date
        return false;
      default:
        return true;
    }
  }

  function hasOriginalData(inputTagType: TagType): boolean {
    switch (inputTagType) {
      case "ID3v2.3": // has original year, not the original date
        return false;
      default:
        return true;
    }
  }

  function calcHash(buf: Buffer): string {
    const hash = crypto.createHash('md5');
    hash.update(buf);
    return hash.digest('hex');
  }

  const performers = [
    "Carmine Rojas (bass guitar)",
    "The Bovaland Orchestra (orchestra)",
    "Anton Fig (drums)",
    "Blondie Chaplin (guitar)",
    "Joe Bonamassa (guitar)",
    "Anton Fig (percussion)",
    "Arlan Schierbaum (keyboard)",
    "Beth Hart (vocals)",
    "Joe Bonamassa (vocals)",
    "Beth Hart (piano)"
  ];

  /**
   * Check common output
   * @param inputTagType Meta-data header format
   * @param common Common tag mapping
   */
  function checkCommonMapping(inputTagType: TagType, common: ICommonTagsResult) {
    // Compare expectedCommonTags with result.common
    t.strictEqual(common.title, "Sinner's Prayer", inputTagType + " => common.title");
    t.strictEqual(common.artist, 'Beth Hart & Joe Bonamassa', inputTagType + " => common.artist");

    if (inputTagType === "asf") {
      t.deepEqual(common.artists, ['Joe Bonamassa', 'Beth Hart'], inputTagType + " => common.artists");
      t.deepEqual(common.musicbrainz_artistid, ['984f8239-8fe1-4683-9c54-10ffb14439e9', '3fe817fc-966e-4ece-b00a-76be43e7e73c'], inputTagType + " => common.musicbrainz_artistid");
    } else {
      t.deepEqual(common.artists, ['Beth Hart', 'Joe Bonamassa'], inputTagType + " => common.artists");
      t.deepEqual(common.musicbrainz_artistid, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], inputTagType + " => common.musicbrainz_artistid");
    }

    t.strictEqual(common.albumartist, 'Beth Hart & Joe Bonamassa', 'common.albumartist'); // ToDo: this is not set
    t.deepEqual(common.albumartistsort, 'Hart, Beth & Bonamassa, Joe', inputTagType + " =>  common.albumartistsort");
    t.strictEqual(common.album, "Don't Explain", inputTagType + " => common.album = Don't Explain");
    if (inputTagType === "asf") {
      t.deepEqual(common.track, {no: 1, of: null}, inputTagType + " => common.track");
    } else {
      t.deepEqual(common.track, {no: 1, of: 10}, inputTagType + " => common.track");
    }
    t.deepEqual(common.disk, {no: 1, of: 1}, inputTagType + " => common.disk");
    if (hasOriginalData(inputTagType)) {
      t.strictEqual(common.originaldate, "2011-09-26", inputTagType + " => common.originaldate = 2011-09-26");
    }
    if (hasReleaseData(inputTagType)) {
      t.strictEqual(common.date, "2011-09-27", inputTagType + " => common.date");
    }
    t.strictEqual(common.year, 2011, inputTagType + " => common.year");
    t.strictEqual(common.originalyear, 2011, inputTagType + " => common.year");
    t.strictEqual(common.media, 'CD', inputTagType + " => common.media = CD");
    t.strictEqual(common.barcode, "804879313915", inputTagType + " => common.barcode");
    // ToDo?? t.deepEqual(common.producer, ['Roy Weisman'], 'common.producer = Roy Weisman')
    t.deepEqual(common.label, ['J&R Adventures'], inputTagType + " => common.label = 'J&R Adventures'");
    t.deepEqual(common.catalognumber, ['PRAR931391'], inputTagType + " => common.catalognumber = PRAR931391");
    t.strictEqual(common.originalyear, 2011, inputTagType + " => common.originalyear = 2011");
    t.strictEqual(common.releasestatus, 'official', inputTagType + " => common.releasestatus = official");
    t.deepEqual(common.releasetype, ['album'], inputTagType + " => common.releasetype");
    t.strictEqual(common.musicbrainz_albumid, 'e7050302-74e6-42e4-aba0-09efd5d431d8', inputTagType + " => common.musicbrainz_albumid");
    t.strictEqual(common.musicbrainz_recordingid, 'f151cb94-c909-46a8-ad99-fb77391abfb8', inputTagType + " => common.musicbrainz_recordingid");

    if (inputTagType === "asf") {
      t.deepEqual(common.musicbrainz_albumartistid, ['984f8239-8fe1-4683-9c54-10ffb14439e9', '3fe817fc-966e-4ece-b00a-76be43e7e73c'], inputTagType + " => common.musicbrainz_albumartistid");
    } else {
      t.deepEqual(common.musicbrainz_albumartistid, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], inputTagType + " => common.musicbrainz_albumartistid");
    }

    t.strictEqual(common.musicbrainz_releasegroupid, 'e00305af-1c72-469b-9a7c-6dc665ca9adc', inputTagType + " => common.musicbrainz_releasegroupid");
    t.strictEqual(common.musicbrainz_trackid, 'd062f484-253c-374b-85f7-89aab45551c7', inputTagType + " => common.musicbrainz_trackid");
    t.strictEqual(common.asin, "B005NPEUB2", inputTagType + " => common.asin");
    t.strictEqual(common.acoustid_id, "09c06fac-679a-45b1-8ea0-6ce532318363", inputTagType + " => common.acoustid_id");

    // Check front cover
    t.strictEqual(common.picture[0].format, 'image/jpeg', 'picture format');
    t.strictEqual(common.picture[0].data.length, 98008, 'picture length');
    t.strictEqual(calcHash(common.picture[0].data), 'c57bec49b36ebf422018f82273d1995a', 'hash front cover data');

    // Check back cover
    t.strictEqual(common.picture[1].format, 'image/png', 'picture format');
    t.strictEqual(common.picture[1].data.length, 120291, 'picture length');
    t.strictEqual(calcHash(common.picture[1].data), '90ec686eb82e745e737b2c7aa706eeaa', 'hash back cover data');

    // ISRC
    t.deepEqual(common.isrc, ["NLB931100460", "USMH51100098"], "ISRC's");

    // Rating
    switch (inputTagType) {

      case 'APEv2':
      case 'iTunes':
        break; // Skip rating tests for mapping type

      default:
        t.isDefined(common.rating, `'${inputTagType}' has rating`);
        t.approximately(common.rating[0].rating, 0.6, 0.1, `'${inputTagType}': rating=3.0`);
    }
  }

  describe("Vorbis mappings", () => {

    /**
     * Check native Vorbis header
     * @param vorbis Vorbis native tags
     */
    function checkVorbisTags(vorbis: INativeTagDict, container: string) {
      // Compare expectedCommonTags with result.common
      t.deepEqual(vorbis.TITLE, ['Sinner\'s Prayer'], 'vorbis.TITLE');
      t.deepEqual(vorbis.ALBUM, ['Don\'t Explain'], 'vorbis.TITLE');
      t.deepEqual(vorbis.DATE, ['2011-09-27'], 'vorbis.DATE');
      t.deepEqual(vorbis.TRACKNUMBER, ['1'], 'vorbis.TRACKNUMBER');
      t.deepEqual(vorbis.PRODUCER, ['Roy Weisman'], 'vorbis.PRODUCER');
      t.deepEqual(vorbis.ENGINEER, ['James McCullagh', 'Jared Kvitka'], 'vorbis.ENGINEER');
      t.deepEqual(vorbis.LABEL, ['J&R Adventures'], 'vorbis.LABEL');
      t.deepEqual(vorbis.CATALOGNUMBER, ['PRAR931391'], 'vorbis.CATALOGNUMBER');
      t.deepEqual(vorbis.ACOUSTID_ID, ['09c06fac-679a-45b1-8ea0-6ce532318363'], 'vorbis.ACOUSTID_ID');
      t.deepEqual(vorbis.ARTIST, ['Beth Hart & Joe Bonamassa'], 'vorbis.ARTIST');
      t.deepEqual(vorbis.ARTISTS, ['Beth Hart', 'Joe Bonamassa'], 'vorbis.ARTISTS');
      t.deepEqual(vorbis.ARTISTSORT, ['Hart, Beth & Bonamassa, Joe'], 'vorbis.ARTISTSORT');
      t.deepEqual(vorbis.ALBUMARTIST, ['Beth Hart & Joe Bonamassa'], 'vorbis.ALBUMARTIST');
      t.deepEqual(vorbis.ALBUMARTISTSORT, ['Hart, Beth & Bonamassa, Joe'], 'vorbis.ALBUMARTISTSORT');
      t.deepEqual(vorbis.ORIGINALDATE, ['2011-09-26'], 'vorbis.ORIGINALDATE');
      t.deepEqual(vorbis.SCRIPT, ['Latn'], 'vorbis.SCRIPT');
      t.deepEqual(vorbis.MEDIA, ['CD'], 'vorbis.MEDIA');
      t.deepEqual(vorbis.MUSICBRAINZ_ALBUMID, ['e7050302-74e6-42e4-aba0-09efd5d431d8'], 'vorbis.MUSICBRAINZ_ALBUMID');
      t.deepEqual(vorbis.MUSICBRAINZ_ALBUMARTISTID, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'vorbis.MUSICBRAINZ_ALBUMARTISTID');
      t.deepEqual(vorbis.MUSICBRAINZ_ARTISTID, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'vorbis.MUSICBRAINZ_ARTISTID');
      t.deepEqual(vorbis.PERFORMER, performers, 'vorbis.PERFORMER');
      t.deepEqual(vorbis.ARRANGER, ['Jeff Bova'], 'vorbis.ARRANGER');
      t.deepEqual(vorbis.MUSICBRAINZ_ALBUMID, ['e7050302-74e6-42e4-aba0-09efd5d431d8'], 'vorbis.MUSICBRAINZ_ALBUMID');
      t.deepEqual(vorbis.MUSICBRAINZ_RELEASETRACKID, ['d062f484-253c-374b-85f7-89aab45551c7'], 'vorbis.MUSICBRAINZ_RELEASETRACKID');
      t.deepEqual(vorbis.MUSICBRAINZ_RELEASEGROUPID, ['e00305af-1c72-469b-9a7c-6dc665ca9adc'], 'vorbis.MUSICBRAINZ_RELEASEGROUPID');
      t.deepEqual(vorbis.MUSICBRAINZ_TRACKID, ['f151cb94-c909-46a8-ad99-fb77391abfb8'], 'vorbis.MUSICBRAINZ_TRACKID');
      t.deepEqual(vorbis.NOTES, ['Medieval CUE Splitter (www.medieval.it)'], 'vorbis.NOTES');
      t.deepEqual(vorbis.BARCODE, ['804879313915'], 'vorbis.BARCODE');
      t.deepEqual(vorbis.ASIN, ['B005NPEUB2'], 'vorbis.ASIN');
      t.deepEqual(vorbis.RELEASECOUNTRY, ['US'], 'vorbis.RELEASECOUNTRY');
      t.deepEqual(vorbis.RELEASESTATUS, ['official'], 'vorbis.RELEASESTATUS');

      t.strictEqual(vorbis.METADATA_BLOCK_PICTURE[0].format, 'image/jpeg', "vorbis.METADATA_BLOCK_PICTURE.format = 'image/jpeg'");
      t.strictEqual(vorbis.METADATA_BLOCK_PICTURE[0].type, 'Cover (front)', "vorbis.METADATA_BLOCK_PICTURE.type = 'Cover (front)'"); // ToDo: description??

      t.strictEqual(vorbis.METADATA_BLOCK_PICTURE[0].description, '', 'vorbis.METADATA_BLOCK_PICTURE.description');
      t.strictEqual(vorbis.METADATA_BLOCK_PICTURE[0].data.length, 98008, 'vorbis.METADATA_BLOCK_PICTURE.data.length = 98008 bytes');
      t.strictEqual(calcHash(vorbis.METADATA_BLOCK_PICTURE[0].data), 'c57bec49b36ebf422018f82273d1995a', 'Picture content');
    }

    it("should map FLAC/Vorbis", () => {

      const filename = "MusicBrainz - Beth Hart - Sinner's Prayer.flac";

      function checkFormat(format) {
        t.strictEqual(format.container, 'FLAC', 'format.container');
        t.strictEqual(format.codec, 'FLAC', 'format.codec');
        t.strictEqual(format.duration, 2.1229931972789116, 'format.duration = 2.123 seconds');
        t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44100 samples/sec');
        t.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample = 16 bits');
        t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 channels');
      }

      // Parse flac/Vorbis file
      return mm.parseFile(path.join(samplePath, filename), {native: true}).then(result => {
        t.ok(result.native && result.native.vorbis, 'should include native Vorbis tags');
        checkFormat(result.format);
        checkVorbisTags(mm.orderTags(result.native.vorbis), result.format.container);
        checkCommonMapping('vorbis', result.common);
      });

    });

    it("should map ogg/Vorbis", () => {

      const filePath = path.join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer.ogg");

      // Parse ogg/Vorbis file
      return mm.parseFile(filePath, {native: true}).then(result => {
        t.ok(result.native && result.native.vorbis, 'should include native Vorbis tags');
        // Check Vorbis native tags
        checkVorbisTags(mm.orderTags(result.native.vorbis), result.format.container);
        // Check common mappings
        checkCommonMapping('vorbis', result.common);
      });
    });

  });

  describe("APEv2 header", () => {

    function checkApeTags(APEv2: INativeTagDict) {
      // Compare expectedCommonTags with result.common
      t.deepEqual(APEv2.Title, ['Sinner\'s Prayer'], 'APEv2.Title');
      t.deepEqual(APEv2.Album, ['Don\'t Explain'], 'APEv2.Album');
      t.deepEqual(APEv2.Year, ['2011-09-27'], 'APEv2.Year');
      t.deepEqual(APEv2.Track, ['1/10'], 'APEv2.Track');
      t.deepEqual(APEv2.Disc, ['1/1'], 'APEv2.Disc');
      t.deepEqual(APEv2.Originalyear, ['2011'], 'APEv2.Year');
      t.deepEqual(APEv2.Originaldate, ['2011-09-26'], 'APEv2.Originaldate');
      t.deepEqual(APEv2.Label, ['J&R Adventures'], 'APEv2.LABEL');
      t.deepEqual(APEv2.CatalogNumber, ['PRAR931391'], 'APEv2.CatalogNumber');
      t.deepEqual(APEv2.Acoustid_Id, ['09c06fac-679a-45b1-8ea0-6ce532318363'], 'APEv2.Acoustid_Id');
      t.deepEqual(APEv2.Artist, ['Beth Hart & Joe Bonamassa'], 'APEv2.Artist');
      t.deepEqual(APEv2.Artists, ['Beth Hart', 'Joe Bonamassa'], 'APEv2.Artists');
      t.deepEqual(APEv2.Artistsort, ['Hart, Beth & Bonamassa, Joe'], 'APEv2.Artistsort');
      t.deepEqual(APEv2['Album Artist'], ['Beth Hart & Joe Bonamassa'], 'APEv2.ALBUMARTIST');
      t.deepEqual(APEv2.Albumartistsort, ['Hart, Beth & Bonamassa, Joe'], 'APEv2.Albumartistsort');
      t.deepEqual(APEv2.Originaldate, ['2011-09-26'], 'APEv2.ORIGINALDATE');
      t.deepEqual(APEv2.Script, ['Latn'], 'APEv2.Script');
      t.deepEqual(APEv2.Media, ['CD'], 'APEv2.Media');
      t.deepEqual(APEv2.Musicbrainz_Albumid, ['e7050302-74e6-42e4-aba0-09efd5d431d8'], 'APEv2.Musicbrainz_Albumid');
      t.deepEqual(APEv2.Musicbrainz_Albumartistid, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'APEv2.Musicbrainz_Albumartistid');
      t.deepEqual(APEv2.Musicbrainz_Artistid, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'APEv2.Musicbrainz_Artistid');

      t.deepEqual(APEv2.Performer, performers, 'APEv2.Performer');
      t.deepEqual(APEv2.Producer, ['Roy Weisman'], 'APEv2.PRODUCER');
      t.deepEqual(APEv2.Engineer, ['James McCullagh', 'Jared Kvitka'], 'APEv2.ENGINEER');
      t.deepEqual(APEv2.Arranger, ['Jeff Bova'], 'APEv2.ARRANGER');

      t.deepEqual(APEv2.Musicbrainz_Albumid, ['e7050302-74e6-42e4-aba0-09efd5d431d8'], 'APEv2.Musicbrainz_Albumid');
      t.deepEqual(APEv2.musicbrainz_releasetrackid, ['d062f484-253c-374b-85f7-89aab45551c7'], 'APEv2.musicbrainz_releasetrackid');
      t.deepEqual(APEv2.Musicbrainz_Releasegroupid, ['e00305af-1c72-469b-9a7c-6dc665ca9adc'], 'APEv2.Musicbrainz_Releasegroupid');
      t.deepEqual(APEv2.musicbrainz_trackid, ['f151cb94-c909-46a8-ad99-fb77391abfb8'], 'APEv2.musicbrainz_trackid');

      // t.deepEqual(APEv2.NOTES, ['Medieval CUE Splitter (www.medieval.it)'], 'APEv2.NOTES')
      t.deepEqual(APEv2.Barcode, ['804879313915'], 'APEv2.Barcode');
      // ToDo: not set??? t.deepEqual(APEv2.ASIN, 'B005NPEUB2', 'APEv2.ASIN');
      // ToDo: not set??? t.deepEqual(APEv2.RELEASECOUNTRY, 'GB', 'APEv2.RELEASECOUNTRY');
      t.deepEqual(APEv2.MUSICBRAINZ_ALBUMSTATUS, ['official'], 'APEv2.MUSICBRAINZ_ALBUMSTATUS');

      t.deepEqual(APEv2.Arranger, ['Jeff Bova'], 'APEv2.Arranger');

      // ToDo:
      t.deepEqual(APEv2['Cover Art (Front)'][0].format, 'image/jpeg', 'picture.format');
      t.deepEqual(APEv2['Cover Art (Front)'][0].description, 'front', 'picture.description');
      t.deepEqual(APEv2['Cover Art (Front)'][0].data.length, 98008, 'picture.data.length');

      t.deepEqual(APEv2['Cover Art (Back)'][0].format, 'image/png', 'picture.format');
      t.deepEqual(APEv2['Cover Art (Back)'][0].description, 'back', 'picture.description');
      t.deepEqual(APEv2['Cover Art (Back)'][0].data.length, 120291, 'picture.data.length');
    }

    it("should map Monkey's Audio / APEv2", () => {

      const filePath = path.join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer.ape");

      function checkFormat(format) {
        t.strictEqual(format.duration, 2.1229931972789116, 'format.duration = 2.123 seconds');
        t.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
        t.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
        t.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample');
        t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
      }

      // Run with default options
      return mm.parseFile(filePath, {native: true}).then(result => {
        t.ok(result.native && result.native.hasOwnProperty('APEv2'), 'should include native APEv2 tags');
        checkFormat(result.format);
        checkApeTags(mm.orderTags(result.native.APEv2));
        checkCommonMapping('APEv2', result.common);
      });

    });

    it("should map WavPack / APEv2", () => {

      const filePath = path.join(samplePath, 'wavpack', "MusicBrainz - Beth Hart - Sinner's Prayer.wv");

      function checkFormat(format) {
        t.strictEqual(format.duration, 2.1229931972789116, 'format.duration = 2.123 seconds');
        t.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
        t.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
        t.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample');
        t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
      }

      // Run with default options
      return mm.parseFile(filePath, {native: true}).then(result => {
        t.ok(result.native && result.native.hasOwnProperty('APEv2'), 'should include native APEv2 tags');
        checkFormat(result.format);
        checkApeTags(mm.orderTags(result.native.APEv2));
        checkCommonMapping('APEv2', result.common);
      });

    });

  });

  describe("ID3v2.3 header", () => {

    function checkID3Tags(native: INativeTagDict) {

      t.deepEqual(native.TIT2, ['Sinner\'s Prayer'], 'id3v23.TIT2: Title/songname/content description');
      t.deepEqual(native.TPE1, ['Beth Hart & Joe Bonamassa'], 'id3v23.TPE1: Lead performer(s)/Soloist(s)');
      t.deepEqual(native.TPE2, ['Beth Hart & Joe Bonamassa'], 'id3v23.TPE2: Band/orchestra/accompaniment');
      t.deepEqual(native.TALB, ['Don\'t Explain'], 'id3v23.TALB: Album/Movie/Show title');
      t.deepEqual(native.TORY, ['2011'], 'id3v23.TORY: Original release year');
      t.deepEqual(native.TYER, ['2011'], 'id3v23.TYER');
      t.deepEqual(native.TPOS, ['1/1'], 'id3v23.TPOS: Part of a set');
      t.deepEqual(native.TRCK, ['1/10'], 'id3v23.TRCK: Track number/Position in set');
      t.deepEqual(native.TPUB, ['J&R Adventures'], 'id3v23.TPUB: Publisher');
      t.deepEqual(native.TMED, ['CD'], 'id3v23.TMED: Media type');
      t.deepEqual(native.UFID[0], {
        owner_identifier: 'http://musicbrainz.org',
        identifier: Buffer.from('f151cb94-c909-46a8-ad99-fb77391abfb8', 'ascii')
      }, 'id3v23.UFID: Unique file identifier');

      t.deepEqual(native.IPLS, [{
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

      t.deepEqual(native['TXXX:ASIN'], ['B005NPEUB2'], 'id3v23.TXXX:ASIN');
      t.deepEqual(native['TXXX:Artists'], ['Beth Hart', 'Joe Bonamassa'], 'id3v23.TXXX:Artists');
      t.deepEqual(native['TXXX:BARCODE'], ['804879313915'], 'id3v23.TXXX:BARCODE');
      t.deepEqual(native['TXXX:CATALOGNUMBER'], ['PRAR931391'], 'id3v23.TXXX:CATALOGNUMBER');
      t.deepEqual(native['TXXX:MusicBrainz Album Artist Id'], ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'id3v23.TXXX:MusicBrainz Album Artist Id');
      t.deepEqual(native['TXXX:MusicBrainz Album Id'], ['e7050302-74e6-42e4-aba0-09efd5d431d8'], 'id3v23.TXXX:MusicBrainz Album Id');
      // ToDo?? t.strictEqual(id3v23['TXXX:MusicBrainz Album Release Country'], 'GB', 'id3v23.TXXX:MusicBrainz Album Release Country')
      t.deepEqual(native['TXXX:MusicBrainz Album Status'], ['official'], 'id3v23.TXXX:MusicBrainz Album Status');
      t.deepEqual(native['TXXX:MusicBrainz Album Type'], ['album'], 'id3v23.TXXX:MusicBrainz Album Type');
      t.deepEqual(native['TXXX:MusicBrainz Artist Id'], ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'id3v23.TXXX:MusicBrainz Artist Id');
      t.deepEqual(native['TXXX:MusicBrainz Release Group Id'], ['e00305af-1c72-469b-9a7c-6dc665ca9adc'], 'id3v23.TXXX.MusicBrainz Release Group Id');
      t.deepEqual(native['TXXX:MusicBrainz Release Track Id'], ['d062f484-253c-374b-85f7-89aab45551c7'], 'id3v23.TXXX.MusicBrainz Release Track Id');
      t.deepEqual(native['TXXX:SCRIPT'], ['Latn'], 'id3v23.TXXX:SCRIPT');
      t.deepEqual(native['TXXX:originalyear'], ['2011'], 'id3v23.TXXX:originalyear');
      // t.strictEqual(native.METADATA_BLOCK_PICTURE.format, 'image/jpeg', 'native.METADATA_BLOCK_PICTURE format')
      // t.strictEqual(native.METADATA_BLOCK_PICTURE.data.length, 98008, 'native.METADATA_BLOCK_PICTURE length')
    }

    it("MP3 / ID3v2.3", () => {

      const filePath = path.join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].V2.mp3");

      function checkFormat(format) {
        t.deepEqual(format.tagTypes, ['ID3v2.3'], 'format.tagTypes');
        t.deepEqual(format.container, 'MPEG', 'format.container');
        t.deepEqual(format.codec, 'MP3', 'format.codec');
        t.strictEqual(format.duration, 2.1681632653061222, 'format.duration');
        t.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
        t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
        t.strictEqual(format.codecProfile, 'V2', 'format.codecProfile');
        t.strictEqual(format.tool, 'LAME3.99r', 'format.tool');
      }

      // Run with default options
      return mm.parseFile(filePath, {native: true}).then(result => {
        t.ok(result.native && result.native.hasOwnProperty('ID3v2.3'), 'should include native id3v2.3 tags');
        checkFormat(result.format);
        checkID3Tags(mm.orderTags(result.native['ID3v2.3']));
        checkCommonMapping('ID3v2.3', result.common);
      });

    });

    /**
     * Looks like RIFF/WAV not fully supported yet in MusicBrainz Picard: https://tickets.metabrainz.org/browse/PICARD-653?jql=text%20~%20%22RIFF%22.
     * This file has been fixed with Mp3Tag to have a valid ID3v2.3 tag
     */
    it("should map RIFF/WAVE/PCM / ID3v2.3", () => {

      const filePath = path.join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].wav");

      function checkFormat(format: IFormat) {
        // t.strictEqual(format.container, "WAVE", "format.container = WAVE PCM");
        t.deepEqual(format.tagTypes, ['exif', 'ID3v2.3'], 'format.tagTypes)');
        t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        t.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample = 16 bits');
        t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 channels');
        t.strictEqual(format.numberOfSamples, 93624, 'format.numberOfSamples = 88200');
        t.strictEqual(format.duration, 2.1229931972789116, 'format.duration = 2 seconds');
      }

      // Parse wma/asf file
      return mm.parseFile(filePath, {native: true}).then(result => {
        // Check wma format
        checkFormat(result.format);
        // Check native tags
        checkID3Tags(mm.orderTags(result.native['ID3v2.3']));
        checkCommonMapping('ID3v2.3', result.common);
      });

    });

  });

  describe("ID3v2.4 header", () => {

    function checkID3Tags(id3v24: INativeTagDict) {

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
        keyboard: ['Arlan Schierbaum'],
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
        identifier: Buffer.from('f151cb94-c909-46a8-ad99-fb77391abfb8', 'ascii')
      }, 'id3v24.UFID: Unique file identifier');

      t.deepEqual(id3v24['TXXX:ASIN'], ['B005NPEUB2'], 'id3v24.TXXX:ASIN');
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

    it("should map MP3/ID3v2.4 header", () => {

      const filePath = path.join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].V2.mp3");

      function checkFormat(format: IFormat) {
        t.deepEqual(format.tagTypes, ['ID3v2.4'], 'format.tagTypes');
        t.strictEqual(format.container, 'MPEG', 'format.container');
        t.strictEqual(format.codec, 'MP3', 'format.codec');
        t.strictEqual(format.codecProfile, 'V2', 'format.codecProfile = V2');
        t.strictEqual(format.tool, 'LAME3.99r', 'format.tool');
        t.strictEqual(format.duration, 2.1681632653061222, 'format.duration');
        t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
      }

      // Run with default options
      return mm.parseFile(filePath, {native: true}).then(result => {
        t.ok(result.native && result.native.hasOwnProperty('ID3v2.4'), 'should include native id3v2.4 tags');
        checkFormat(result.format);
        checkID3Tags(mm.orderTags(result.native['ID3v2.4']));
        checkCommonMapping('ID3v2.4', result.common);
      });

    });

    it("should parse AIFF/ID3v2.4 audio file", () => {

      const filePath = path.join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].aiff");

      function checkFormat(format: IFormat) {
        t.strictEqual(format.container, "AIFF", "format.container = 'AIFF'");
        t.deepEqual(format.tagTypes, ["ID3v2.4"], "format.tagTypes = 'ID3v2.4'"); // ToDo
        t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        t.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample = 16 bits');
        t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 channels');
        t.strictEqual(format.numberOfSamples, 93624, 'format.bitsPerSample = 93624');
        t.strictEqual(format.duration, 2.1229931972789116, 'format.duration = ~2.123');
      }

      // Parse wma/asf file
      return mm.parseFile(filePath, {native: true}).then(result => {
        t.ok(result.native && result.native['ID3v2.4'], 'should include native id3v2.4 tags');
        // Check wma format
        checkFormat(result.format);
        // Check ID3v2.4 native tags
        checkID3Tags(mm.orderTags(result.native['ID3v2.4']));
        // Check common tag mappings
        checkCommonMapping('ID3v2.4', result.common);
      });

    });

  });

  it("should map M4A / (Apple) iTunes header", () => {

    const filePath = path.join(samplePath,  "MusicBrainz - Beth Hart - Sinner's Prayer.m4a");

    function checkFormat(format: IFormat) {
      t.deepEqual(format.tagTypes, ['iTunes'], 'format.tagTypes');
      t.strictEqual(format.container, 'isom/mp42/M4A', 'format.container');
      t.strictEqual(format.codec, 'ALAC', 'format.codec');
      t.strictEqual(format.lossless, true, 'ALAC is a lossless format');
      t.strictEqual(format.duration, 2.1229931972789116, 'format.duration');
      t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
      // t.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample'); // ToDo
      // t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels'); // ToDo
    }

    function checkCommonTags(common) {
      t.strictEqual(common.picture[0].format, 'image/jpeg', 'picture format');
      t.strictEqual(common.picture[0].data.length, 98008, 'picture length');
    }

    function check_iTunes_Tags(iTunes: INativeTagDict) {

      t.deepEqual(iTunes["©nam"], ["Sinner's Prayer"], "iTunes.©nam => common.title");
      t.deepEqual(iTunes["©ART"], ["Beth Hart & Joe Bonamassa"], "iTunes.@ART => common.artist");
      t.deepEqual(iTunes["©alb"], ["Don't Explain"], "iTunes.©alb => common.album");
      t.deepEqual(iTunes.soar, ["Hart, Beth & Bonamassa, Joe"], "iTunes.soar => common.artistsort");
      t.deepEqual(iTunes.soaa, ["Hart, Beth & Bonamassa, Joe"], "iTunes.soaa => common.albumartistsort");
      t.deepEqual(iTunes["----:com.apple.iTunes:ARTISTS"], ["Beth Hart", "Joe Bonamassa"], "iTunes.----:com.apple.iTunes:ARTISTS => common.artists");
      t.deepEqual(iTunes.aART, [ 'Beth Hart & Joe Bonamassa' ], "iTunes.aART => common.albumartist");
      t.deepEqual(iTunes["----:com.apple.iTunes:Band"], ["Beth Hart & Joe Bonamassa"], "iTunes.----:com.apple.iTunes:Band => common.albumartist");
      t.deepEqual(iTunes.trkn, ["1/10"], "iTunes.trkn => common.track");
      t.deepEqual(iTunes.disk, ["1/1"], "iTunes.trkn => common.disk");
      t.deepEqual(iTunes["----:com.apple.iTunes:ORIGINALDATE"], ["2011-09-26"], "iTunes.----:com.apple.iTunes:ORIGINALDATE => common.albumartistsort");
      t.deepEqual(iTunes["----:com.apple.iTunes:ORIGINALYEAR"], ["2011"], "iTunes.----:com.apple.iTunes:ORIGINALDATE => common.originalyear");

      t.deepEqual(iTunes["----:com.apple.iTunes:ACOUSTID_ID"], ["09c06fac-679a-45b1-8ea0-6ce532318363"]);
      t.deepEqual(iTunes["----:com.apple.iTunes:ARRANGER"], ["Jeff Bova"]);

      t.deepEqual(iTunes["----:com.apple.iTunes:NOTES"], ["Medieval CUE Splitter (www.medieval.it)"]);
      // ToDO
    }

    // Run with default options
    return mm.parseFile(filePath, {native: true}).then(result => {
      t.ok(result.native && result.native.iTunes, 'should include native M4A tags');
      checkFormat(result.format);
      check_iTunes_Tags(mm.orderTags(result.native.iTunes));
      checkCommonTags(result.common);
      checkCommonMapping('iTunes', result.common);
    });

  });

  it("should map WMA/ASF header", () => {

    const filePath = path.join(samplePath,  "MusicBrainz - Beth Hart - Sinner's Prayer.wma");

    function checkFormat(format: IFormat) {
      t.deepEqual(format.tagTypes, ["asf"], "format.tagTypes = asf");
      t.strictEqual(format.bitrate, 320000, "format.bitrate = 320000");
      // ToDo t.strictEqual(format.container, "wma", "format.container = wma");
      t.strictEqual(format.duration, 5.235, 'format.duration'); // duration is wrong, but seems to be what is written in file
      // ToDo t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
      // ToDo t.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample'); // ToDo
      // ToDo t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels'); // ToDo
    }

    function check_asf_Tags(native: INativeTagDict) {
      t.deepEqual(native["WM/AlbumArtist"], ["Beth Hart & Joe Bonamassa"], "asf.WM/AlbumArtist => common.albumartist = 'Beth Hart & Joe Bonamassa'");
      t.deepEqual(native["WM/AlbumTitle"], ["Don't Explain"], "asf.WM/AlbumTitle => common.albumtitle = 'Don't Explain'");
      t.deepEqual(native["WM/ARTISTS"], ['Joe Bonamassa', 'Beth Hart'], "asf.WM/ARTISTS => common.artists = ['Joe Bonamassa', 'Beth Hart']");
      t.isDefined(native["WM/Picture"], "Contains WM/Picture");
      t.strictEqual(native["WM/Picture"].length, 1, "Contains 1 WM/Picture");
      // ToDO
    }

    // Parse wma/asf file
    return mm.parseFile(filePath, {native: true}).then(result => {
      t.ok(result.native && result.native.asf, 'should include native asf tags');
      // Check wma format
      checkFormat(result.format);
      // Check asf native tags
      check_asf_Tags(mm.orderTags(result.native.asf));
      // Check common tag mappings
      // ToDo checkCommonMapping(result.format.tagTypes, result.common);
    });

  });

});
