import { expect, test } from "vitest";
import { AsfTagMapper } from "../lib/asf/AsfTagMapper";
import { APEv2TagMapper } from "../lib/apev2/APEv2TagMapper";
import { ID3v24TagMapper } from "../lib/id3v2/ID3v24TagMapper";

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

test("ASF", () => {
  /**
   * Picard mappings
   * Taken from: picard-release-1.4.2/picard/formats/asf.py
   */
  const PicardMappings: Record<string, string> = {
    album: "WM/AlbumTitle",
    title: "Title",
    artist: "Author",
    albumartist: "WM/AlbumArtist",
    date: "WM/Year",
    originaldate: "WM/OriginalReleaseTime",
    originalyear: "WM/OriginalReleaseYear",
    composer: "WM/Composer",
    lyricist: "WM/Writer",
    conductor: "WM/Conductor",
    remixer: "WM/ModifiedBy",
    producer: "WM/Producer",
    grouping: "WM/ContentGroupDescription",
    subtitle: "WM/SubTitle",
    discsubtitle: "WM/SetSubTitle",
    tracknumber: "WM/TrackNumber",
    discnumber: "WM/PartOfSet",
    comment: "Description",
    genre: "WM/Genre",
    bpm: "WM/BeatsPerMinute",
    key: "WM/InitialKey",
    script: "WM/Script",
    language: "WM/Language",
    mood: "WM/Mood",
    isrc: "WM/ISRC",
    copyright: "Copyright",
    lyrics: "WM/Lyrics",
    rating: "WM/SharedUserRating",
    media: "WM/Media",
    barcode: "WM/Barcode",
    catalognumber: "WM/CatalogNo",
    label: "WM/Publisher",
    encodedby: "WM/EncodedBy",
    encodersettings: "WM/EncodingSettings",
    albumsort: "WM/AlbumSortOrder",
    albumartistsort: "WM/AlbumArtistSortOrder",
    artistsort: "WM/ArtistSortOrder",
    titlesort: "WM/TitleSortOrder",
    composersort: "WM/ComposerSortOrder",
    musicbrainz_recordingid: "MusicBrainz/Track Id",
    musicbrainz_trackid: "MusicBrainz/Release Track Id",
    musicbrainz_albumid: "MusicBrainz/Album Id",
    musicbrainz_artistid: "MusicBrainz/Artist Id",
    musicbrainz_albumartistid: "MusicBrainz/Album Artist Id",
    musicbrainz_trmid: "MusicBrainz/TRM Id",
    musicbrainz_discid: "MusicBrainz/Disc Id",
    musicbrainz_workid: "MusicBrainz/Work Id",
    musicbrainz_releasegroupid: "MusicBrainz/Release Group Id",
    musicip_puid: "MusicIP/PUID",
    releasestatus: "MusicBrainz/Album Status",
    releasetype: "MusicBrainz/Album Type",
    releasecountry: "MusicBrainz/Album Release Country",
    acoustid_id: "Acoustid/Id",
    acoustid_fingerprint: "Acoustid/Fingerprint",
    compilation: "WM/IsCompilation",
    engineer: "WM/Engineer",
    asin: "ASIN",
    djmixer: "WM/DJMixer",
    mixer: "WM/Mixer",
    artists: "WM/ARTISTS",
    work: "WM/Work",
    website: "WM/AuthorURL",
  };

  const tagMapper = new AsfTagMapper();

  for (const [picComTag, picNativeTag] of Object.entries(PicardMappings)) {
    const mmCommonTag = convertName(picComTag);

    expect(
      tagMapper.tagMap[picNativeTag],
      `Is '${picNativeTag}' defined?`
    ).toBeDefined();
    expect(
      tagMapper.tagMap[picNativeTag],
      `Check Picard mapping for ${picNativeTag}`
    ).toBe(mmCommonTag);
  }
});

test("APEv2", () => {
  /**
   * Picard mappings
   * Taken from: picard-release-1.4.2/picard/formats/apev2.py
   */
  const PicardMappings = {
    albumartist: "ALBUM ARTIST",
    remixer: "MIXARTIST",
    website: "WEBLINK",
    discsubtitle: "DISCSUBTITLE",
    bpm: "BPM",
    isrc: "ISRC",
    catalognumber: "CATALOGNUMBER",
    barcode: "BARCODE",
    encodedby: "ENCODEDBY",
    language: "LANGUAGE",
    releasestatus: "MUSICBRAINZ_ALBUMSTATUS",
    releasetype: "MUSICBRAINZ_ALBUMTYPE",
    musicbrainz_recordingid: "MUSICBRAINZ_TRACKID",
    musicbrainz_trackid: "MUSICBRAINZ_RELEASETRACKID",
  };

  const tagMapper = new APEv2TagMapper();

  for (const [picComTag, picNativeTag] of Object.entries(PicardMappings)) {
    const mmCommonTag = convertName(picComTag);

    expect(
      tagMapper.tagMap[picNativeTag],
      `Is '${picNativeTag}' defined?`
    ).toBeDefined();
    expect(
      tagMapper.tagMap[picNativeTag],
      `Check Picard mapping for ${picNativeTag}`
    ).toBe(mmCommonTag);
  }
});

test("ID3v2.4.0", () => {
  /**
   * Picard mappings
   * Taken from: picard-release-1.4.2/picard/formats/asf.py
   */
  const PicardMappings: Record<string, string> = {
    // In same sequence as defined at http://id3.org/id3v2.4.0-frames
    grouping: "TIT1",
    title: "TIT2",
    subtitle: "TIT3",
    album: "TALB",
    discsubtitle: "TSST",
    isrc: "TSRC",
    artist: "TPE1",
    albumartist: "TPE2",
    conductor: "TPE3",
    remixer: "TPE4",
    lyricist: "TEXT",
    composer: "TCOM",
    encodedby: "TENC",
    bpm: "TBPM",
    key: "TKEY",
    language: "TLAN",
    genre: "TCON",
    media: "TMED",
    mood: "TMOO",
    copyright: "TCOP",
    label: "TPUB",
    originaldate: "TDOR",
    date: "TDRC",
    encodersettings: "TSSE",
    albumsort: "TSOA",
    artistsort: "TSOP",
    titlesort: "TSOT",
    license: "WCOP",
    website: "WOAR",
    comment: "COMM",
    originalalbum: "TOAL",
    originalartist: "TOPE",

    // The following are informal iTunes extensions to id3v2:
    compilation: "TCMP",
    composersort: "TSOC",
    albumartistsort: "TSO2",
  };

  const tagMapper = new ID3v24TagMapper();

  for (const [picComTag, picNativeTag] of Object.entries(PicardMappings)) {
    const mmCommonTag = convertName(picComTag);

    expect(
      tagMapper.tagMap[picNativeTag],
      `Is '${picNativeTag}' defined?`
    ).toBeDefined();
    expect(
      tagMapper.tagMap[picNativeTag],
      `Check Picard mapping for ${picNativeTag}`
    ).toBe(mmCommonTag);
  }
});
