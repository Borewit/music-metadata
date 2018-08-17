import {assert} from 'chai';
import {AsfTagMapper} from "../src/asf/AsfTagMapper";
import {APEv2TagMapper} from "../src/apev2/APEv2TagMapper";
import {ID3v24TagMapper} from "../src/id3v2/ID3v24TagMapper";

describe("Picard mapping coverage", () => {

  function convertName(picardName: string) {
    switch (picardName) {
      case "tracknumber":
        return "track"; // ToDo: make consistent with Picard convention
      case "discnumber":
        return "disk"; // ToDo: make consistent with Picard convention
      default:
        return picardName;
    }
  }

  it("ASF", () => {

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

    const asfTagMapper = new AsfTagMapper();

    for (const picComTag in PicardMappings) {
      const picNativeTag = PicardMappings[picComTag];
      const mmCommonTag = convertName(picComTag);

      assert.isDefined(asfTagMapper.tagMap[picNativeTag], "Is '" + picNativeTag + "' defined?");
      assert.equal(asfTagMapper.tagMap[picNativeTag], mmCommonTag, "Check Picard mapping for " + picNativeTag);
    }

  });

  it("APEv2", () => {

    /**
     * Picard mappings
     * Taken from: picard-release-1.4.2/picard/formats/apev2.py
     */
    const PicardMappings = {
      "Album Artist": "albumartist",
      MixArtist: "remixer",
      Weblink: "website",
      DiscSubtitle: "discsubtitle",
      BPM: "bpm",
      ISRC: "isrc",
      CatalogNumber: "catalognumber",
      Barcode: "barcode",
      EncodedBy: "encodedby",
      Language: "language",
      MUSICBRAINZ_ALBUMSTATUS: "releasestatus",
      MUSICBRAINZ_ALBUMTYPE: "releasetype",
      musicbrainz_trackid: "musicbrainz_recordingid",
      musicbrainz_releasetrackid: "musicbrainz_trackid"
    };

    const apeTagMapper = new APEv2TagMapper();

    for (const picNativeTag in PicardMappings) {
      const picComTag = PicardMappings[picNativeTag];
      const mmCommonTag = convertName(picComTag);

      assert.isDefined(apeTagMapper.tagMap[picNativeTag.toUpperCase()], "Is '" + picNativeTag + "' defined?");
      assert.equal(apeTagMapper.tagMap[picNativeTag.toUpperCase()], mmCommonTag, "Check Picard mapping for " + picNativeTag);
    }

  });

  it("ID3v2.4.0", () => {

    /**
     * Picard mappings
     * Taken from: picard-release-1.4.2/picard/formats/asf.py
     */
    const PicardMappings = {
      // In same sequence as defined at http://id3.org/id3v2.4.0-frames
      TIT1: 'grouping',
      TIT2: 'title',
      TIT3: 'subtitle',
      TALB: 'album',
      TSST: 'discsubtitle',
      TSRC: 'isrc',
      TPE1: 'artist',
      TPE2: 'albumartist',
      TPE3: 'conductor',
      TPE4: 'remixer',
      TEXT: 'lyricist',
      TCOM: 'composer',
      TENC: 'encodedby',
      TBPM: 'bpm',
      TKEY: 'key',
      TLAN: 'language',
      TCON: 'genre',
      TMED: 'media',
      TMOO: 'mood',
      TCOP: 'copyright',
      TPUB: 'label',
      TDOR: 'originaldate',
      TDRC: 'date',
      TSSE: 'encodersettings',
      TSOA: 'albumsort',
      TSOP: 'artistsort',
      TSOT: 'titlesort',
      WCOP: 'license',
      WOAR: 'website',
      COMM: 'comment',
      TOAL: 'originalalbum',
      TOPE: 'originalartist',

      // The following are informal iTunes extensions to id3v2:
      TCMP: 'compilation',
      TSOC: 'composersort',
      TSO2: 'albumartistsort'
    };

    const id3v24TagMapper = new ID3v24TagMapper();

    for (const picNativeTag in PicardMappings) {
      const picComTag = PicardMappings[picNativeTag];
      const mmCommonTag = convertName(picComTag);

      assert.isDefined(id3v24TagMapper.tagMap[picNativeTag], "Is '" + picNativeTag + "' defined?");
      assert.equal(id3v24TagMapper.tagMap[picNativeTag], mmCommonTag, "Check Picard mapping for " + picNativeTag);
    }

  });

});
