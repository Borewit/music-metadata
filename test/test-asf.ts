import {} from "mocha";
import {assert} from 'chai';
import * as mm from '../src';
import {INativeTagDict} from "../src/index";
import * as path from 'path';
import GUID from "../src/asf/GUID";
import {AsfTagMap} from "../src/asf/AsfTagMap";

const t = assert;

describe("ASF", () => {

  describe("GUID", () => {
    it("should construct GUID from string", () => {

      const Header_GUID = new Buffer([
        0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11,
        0xA6, 0xD9, 0x00, 0xAA, 0x00, 0x62, 0xCE, 0x6C
      ]);

      assert.deepEqual(GUID.HeaderObject.toBin(), Header_GUID);
    });
  });

  it("should parse ASF", () => {

    const filePath = path.join(__dirname, 'samples', 'asf.wma');

    function checkFormat(format) {
      t.strictEqual(format.duration, 244.885, 'format.duration');
      t.strictEqual(format.bitrate, 192639, 'format.bitrate');
    }

    function checkCommon(common) {
      t.strictEqual(common.title, "Don't Bring Me Down", 'common.title');
      t.deepEqual(common.artist, 'Electric Light Orchestra', 'common.artist');
      t.deepEqual(common.albumartist, 'Electric Light Orchestra', 'common.albumartist');
      t.strictEqual(common.album, 'Discovery', 'common.album');
      t.strictEqual(common.year, 2001, 'common.year');
      t.deepEqual(common.track, {no: 9, of: null}, 'common.track 9/0');
      t.deepEqual(common.disk, {no: null, of: null}, 'common.disk 0/0');
      t.deepEqual(common.genre, ['Rock'], 'common.genre');
    }

    function checkNative(native: INativeTagDict) {

      t.deepEqual(native['WM/AlbumTitle'], ['Discovery'], 'native: WM/AlbumTitle');
      t.deepEqual(native['WM/BeatsPerMinute'], [117], 'native: WM/BeatsPerMinute');
      t.deepEqual(native.REPLAYGAIN_TRACK_GAIN, ['-4.7 dB'], 'native: REPLAYGAIN_TRACK_GAIN');
    }

    return mm.parseFile(filePath, {native: true}).then((result) => {

      checkFormat(result.format);

      checkCommon(result.common);

      t.ok(result.native && result.native.asf, 'should include native ASF tags');
      checkNative(mm.orderTags(result.native.asf));
    });

  });

  it("should be consistent with Picard mappings", () => {

    /**
     * Picard mappings
     * Taken from: picard-release-1.4.2/picard/formats/asf.py
     */
    const PicardMappings = {
      album: 'WM/AlbumTitle',
      title: 'Title',
      artist: 'Author',
      albumartist: 'WM/AlbumArtist',
      date: 'WM/Year',
      originaldate: 'WM/OriginalReleaseTime',
      originalyear: 'WM/OriginalReleaseYear',
      composer: 'WM/Composer',
      lyricist: 'WM/Writer',
      conductor: 'WM/Conductor',
      remixer: 'WM/ModifiedBy',
      producer: 'WM/Producer',
      grouping: 'WM/ContentGroupDescription',
      subtitle: 'WM/SubTitle',
      discsubtitle: 'WM/SetSubTitle',
      tracknumber: 'WM/TrackNumber',
      discnumber: 'WM/PartOfSet',
      comment: 'Description',
      genre: 'WM/Genre',
      bpm: 'WM/BeatsPerMinute',
      key: 'WM/InitialKey',
      script: 'WM/Script',
      language: 'WM/Language',
      mood: 'WM/Mood',
      isrc: 'WM/ISRC',
      copyright: 'Copyright',
      lyrics: 'WM/Lyrics',
      rating: 'WM/SharedUserRating',
      media: 'WM/Media',
      barcode: 'WM/Barcode',
      catalognumber: 'WM/CatalogNo',
      label: 'WM/Publisher',
      encodedby: 'WM/EncodedBy',
      encodersettings: 'WM/EncodingSettings',
      albumsort: 'WM/AlbumSortOrder',
      albumartistsort: 'WM/AlbumArtistSortOrder',
      artistsort: 'WM/ArtistSortOrder',
      titlesort: 'WM/TitleSortOrder',
      composersort: 'WM/ComposerSortOrder',
      musicbrainz_recordingid: 'MusicBrainz/Track Id',
      musicbrainz_trackid: 'MusicBrainz/Release Track Id',
      musicbrainz_albumid: 'MusicBrainz/Album Id',
      musicbrainz_artistid: 'MusicBrainz/Artist Id',
      musicbrainz_albumartistid: 'MusicBrainz/Album Artist Id',
      musicbrainz_trmid: 'MusicBrainz/TRM Id',
      musicbrainz_discid: 'MusicBrainz/Disc Id',
      musicbrainz_workid: 'MusicBrainz/Work Id',
      musicbrainz_releasegroupid: 'MusicBrainz/Release Group Id',
      musicip_puid: 'MusicIP/PUID',
      releasestatus: 'MusicBrainz/Album Status',
      releasetype: 'MusicBrainz/Album Type',
      releasecountry: 'MusicBrainz/Album Release Country',
      acoustid_id: 'Acoustid/Id',
      acoustid_fingerprint: 'Acoustid/Fingerprint',
      compilation: 'WM/IsCompilation',
      engineer: 'WM/Engineer',
      asin: 'ASIN',
      djmixer: 'WM/DJMixer',
      mixer: 'WM/Mixer',
      artists: 'WM/ARTISTS',
      work: 'WM/Work',
      website: 'WM/AuthorURL'
    };

    function convertName(picardName: string) {
      switch (picardName) {
        case "tracknumber":
          return "track"; // ToDo: make consistent with Picard convention
        case "discnumber":
          return "disk"; // ToDo: make consistent with Picard convention
        case "rating":
          return "_rating"; // ToDo: make consistent with Picard convention
        default:
          return picardName;
      }
    }

    for (const picComTag in PicardMappings) {
      const picNativeTag = PicardMappings[picComTag];
      const mmCommonTag = convertName(picComTag);

      assert.isDefined(AsfTagMap[picNativeTag], "Is '" + picNativeTag + "' defined?");
      assert.equal(AsfTagMap[picNativeTag], mmCommonTag, "Check Picard mapping for " + picNativeTag);
    }

  });

});
