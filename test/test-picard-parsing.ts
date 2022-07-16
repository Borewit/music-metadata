import { describe, test, expect } from "vitest";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { TagType } from "../lib/common/GenericTagTypes";
import { ICommonTagsResult, INativeTagDict, parseFile, orderTags } from "../lib";
import { samplePath } from "./util";

/**
 * Check if different header formats map to the same common output.
 * Ref: https://picard.musicbrainz.org/docs/mappings/
 */

// Following function manage common mapping exceptions, for good or bad reasons

function hasReleaseData(inputTagType: TagType): boolean {
  return inputTagType !== "ID3v2.3";
}

function hasOriginalData(inputTagType: TagType): boolean {
  switch (inputTagType) {
    case "ID3v2.3": // has original year, not the original date
      return false;
    default:
      return true;
  }
}

function calcHash(buf: Uint8Array): string {
  const hash = createHash("md5");
  hash.update(buf);
  return hash.digest("hex");
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
  "Beth Hart (piano)",
];

/**
 * Check common output
 * @param inputTagType Meta-data header format
 * @param common Common tag mapping
 */
function checkCommonMapping(inputTagType: TagType, common: ICommonTagsResult) {
  // Compare expectedCommonTags with result.common
  expect(common.title, inputTagType + " => common.title").toBe("Sinner's Prayer");
  expect(common.artist, inputTagType + " => common.artist").toBe("Beth Hart & Joe Bonamassa");

  if (inputTagType === "asf") {
    expect(common.artists, inputTagType + " => common.artists").toStrictEqual(["Joe Bonamassa", "Beth Hart"]);
    expect(common.musicbrainz_artistid, inputTagType + " => common.musicbrainz_artistid").toStrictEqual([
      "984f8239-8fe1-4683-9c54-10ffb14439e9",
      "3fe817fc-966e-4ece-b00a-76be43e7e73c",
    ]);
  } else {
    expect(common.artists, inputTagType + " => common.artists").toStrictEqual(["Beth Hart", "Joe Bonamassa"]);
    expect(common.musicbrainz_artistid, inputTagType + " => common.musicbrainz_artistid").toStrictEqual([
      "3fe817fc-966e-4ece-b00a-76be43e7e73c",
      "984f8239-8fe1-4683-9c54-10ffb14439e9",
    ]);
  }

  expect(common.albumartist, "common.albumartist").toBe("Beth Hart & Joe Bonamassa"); // ToDo: this is not set
  expect(common.albumartistsort, inputTagType + " =>  common.albumartistsort").toBe("Hart, Beth & Bonamassa, Joe");
  expect(common.album, inputTagType + " => common.album = Don't Explain").toBe("Don't Explain");
  if (inputTagType === "asf") {
    expect(common.track, inputTagType + " => common.track").toStrictEqual({
      no: 1,
      of: null,
    });
  } else {
    expect(common.track, inputTagType + " => common.track").toStrictEqual({
      no: 1,
      of: 10,
    });
  }
  expect(common.disk, inputTagType + " => common.disk").toStrictEqual({
    no: 1,
    of: 1,
  });
  if (hasOriginalData(inputTagType)) {
    expect(common.originaldate, inputTagType + " => common.originaldate = 2011-09-26").toBe("2011-09-26");
  }
  if (hasReleaseData(inputTagType)) {
    expect(common.date, inputTagType + " => common.date").toBe("2011-09-27");
  }
  expect(common.year, inputTagType + " => common.year").toBe(2011);
  expect(common.originalyear, inputTagType + " => common.year").toBe(2011);
  expect(common.media, inputTagType + " => common.media = CD").toBe("CD");
  expect(common.barcode, inputTagType + " => common.barcode").toBe("804879313915");
  // ToDo?? t.deepEqual(common.producer, ['Roy Weisman'], 'common.producer = Roy Weisman')
  expect(common.label, inputTagType + " => common.label = 'J&R Adventures'").toStrictEqual(["J&R Adventures"]);
  expect(common.catalognumber, inputTagType + " => common.catalognumber = PRAR931391").toStrictEqual(["PRAR931391"]);
  expect(common.originalyear, inputTagType + " => common.originalyear = 2011").toBe(2011);
  expect(common.releasestatus, inputTagType + " => common.releasestatus = official").toBe("official");
  expect(common.releasetype, inputTagType + " => common.releasetype").toStrictEqual(["album"]);
  expect(common.musicbrainz_albumid, inputTagType + " => common.musicbrainz_albumid").toBe(
    "e7050302-74e6-42e4-aba0-09efd5d431d8"
  );
  expect(common.musicbrainz_recordingid, inputTagType + " => common.musicbrainz_recordingid").toBe(
    "f151cb94-c909-46a8-ad99-fb77391abfb8"
  );

  if (inputTagType === "asf") {
    expect(common.musicbrainz_albumartistid, inputTagType + " => common.musicbrainz_albumartistid").toStrictEqual([
      "984f8239-8fe1-4683-9c54-10ffb14439e9",
      "3fe817fc-966e-4ece-b00a-76be43e7e73c",
    ]);
  } else {
    expect(common.musicbrainz_albumartistid, inputTagType + " => common.musicbrainz_albumartistid").toStrictEqual([
      "3fe817fc-966e-4ece-b00a-76be43e7e73c",
      "984f8239-8fe1-4683-9c54-10ffb14439e9",
    ]);
  }

  expect(common.musicbrainz_releasegroupid, inputTagType + " => common.musicbrainz_releasegroupid").toBe(
    "e00305af-1c72-469b-9a7c-6dc665ca9adc"
  );
  expect(common.musicbrainz_trackid, inputTagType + " => common.musicbrainz_trackid").toBe(
    "d062f484-253c-374b-85f7-89aab45551c7"
  );
  expect(common.asin, inputTagType + " => common.asin").toBe("B005NPEUB2");
  expect(common.acoustid_id, inputTagType + " => common.acoustid_id").toBe("09c06fac-679a-45b1-8ea0-6ce532318363");

  // Check front cover
  expect(common.picture[0].format, "picture format").toBe("image/jpeg");
  expect(common.picture[0].data.length, "picture length").toBe(98_008);
  expect(calcHash(common.picture[0].data), "hash front cover data").toBe("c57bec49b36ebf422018f82273d1995a");

  // Check back cover
  expect(common.picture[1].format, "picture format").toBe("image/png");
  expect(common.picture[1].data.length, "picture length").toBe(120_291);
  expect(calcHash(common.picture[1].data), "hash back cover data").toBe("90ec686eb82e745e737b2c7aa706eeaa");

  // ISRC
  expect(common.isrc, "ISRC's").toStrictEqual(["NLB931100460", "USMH51100098"]);

  // Rating
  switch (inputTagType) {
    case "APEv2":
    case "iTunes":
      break; // Skip rating tests for mapping type

    default:
      expect(common.rating, `'${inputTagType}' has rating`).toBeDefined();
      expect(common.rating[0].rating, `'${inputTagType}': rating=3.0`).toBeCloseTo(0.6, 2);
  }
}

/**
 * Check native Vorbis header
 * @param vorbis Vorbis native tags
 */
function checkVorbisTags(vorbis: INativeTagDict) {
  // Compare expectedCommonTags with result.common
  expect(vorbis.TITLE, "vorbis.TITLE").toStrictEqual(["Sinner's Prayer"]);
  expect(vorbis.ALBUM, "vorbis.TITLE").toStrictEqual(["Don't Explain"]);
  expect(vorbis.DATE, "vorbis.DATE").toStrictEqual(["2011-09-27"]);
  expect(vorbis.TRACKNUMBER, "vorbis.TRACKNUMBER").toStrictEqual(["1"]);
  expect(vorbis.PRODUCER, "vorbis.PRODUCER").toStrictEqual(["Roy Weisman"]);
  expect(vorbis.ENGINEER, "vorbis.ENGINEER").toStrictEqual(["James McCullagh", "Jared Kvitka"]);
  expect(vorbis.LABEL, "vorbis.LABEL").toStrictEqual(["J&R Adventures"]);
  expect(vorbis.CATALOGNUMBER, "vorbis.CATALOGNUMBER").toStrictEqual(["PRAR931391"]);
  expect(vorbis.ACOUSTID_ID, "vorbis.ACOUSTID_ID").toStrictEqual(["09c06fac-679a-45b1-8ea0-6ce532318363"]);
  expect(vorbis.ARTIST, "vorbis.ARTIST").toStrictEqual(["Beth Hart & Joe Bonamassa"]);
  expect(vorbis.ARTISTS, "vorbis.ARTISTS").toStrictEqual(["Beth Hart", "Joe Bonamassa"]);
  expect(vorbis.ARTISTSORT, "vorbis.ARTISTSORT").toStrictEqual(["Hart, Beth & Bonamassa, Joe"]);
  expect(vorbis.ALBUMARTIST, "vorbis.ALBUMARTIST").toStrictEqual(["Beth Hart & Joe Bonamassa"]);
  expect(vorbis.ALBUMARTISTSORT, "vorbis.ALBUMARTISTSORT").toStrictEqual(["Hart, Beth & Bonamassa, Joe"]);
  expect(vorbis.ORIGINALDATE, "vorbis.ORIGINALDATE").toStrictEqual(["2011-09-26"]);
  expect(vorbis.SCRIPT, "vorbis.SCRIPT").toStrictEqual(["Latn"]);
  expect(vorbis.MEDIA, "vorbis.MEDIA").toStrictEqual(["CD"]);
  expect(vorbis.MUSICBRAINZ_ALBUMID, "vorbis.MUSICBRAINZ_ALBUMID").toStrictEqual([
    "e7050302-74e6-42e4-aba0-09efd5d431d8",
  ]);
  expect(vorbis.MUSICBRAINZ_ALBUMARTISTID, "vorbis.MUSICBRAINZ_ALBUMARTISTID").toStrictEqual([
    "3fe817fc-966e-4ece-b00a-76be43e7e73c",
    "984f8239-8fe1-4683-9c54-10ffb14439e9",
  ]);
  expect(vorbis.MUSICBRAINZ_ARTISTID, "vorbis.MUSICBRAINZ_ARTISTID").toStrictEqual([
    "3fe817fc-966e-4ece-b00a-76be43e7e73c",
    "984f8239-8fe1-4683-9c54-10ffb14439e9",
  ]);
  expect(vorbis.PERFORMER, "vorbis.PERFORMER").toStrictEqual(performers);
  expect(vorbis.ARRANGER, "vorbis.ARRANGER").toStrictEqual(["Jeff Bova"]);
  expect(vorbis.MUSICBRAINZ_ALBUMID, "vorbis.MUSICBRAINZ_ALBUMID").toStrictEqual([
    "e7050302-74e6-42e4-aba0-09efd5d431d8",
  ]);
  expect(vorbis.MUSICBRAINZ_RELEASETRACKID, "vorbis.MUSICBRAINZ_RELEASETRACKID").toStrictEqual([
    "d062f484-253c-374b-85f7-89aab45551c7",
  ]);
  expect(vorbis.MUSICBRAINZ_RELEASEGROUPID, "vorbis.MUSICBRAINZ_RELEASEGROUPID").toStrictEqual([
    "e00305af-1c72-469b-9a7c-6dc665ca9adc",
  ]);
  expect(vorbis.MUSICBRAINZ_TRACKID, "vorbis.MUSICBRAINZ_TRACKID").toStrictEqual([
    "f151cb94-c909-46a8-ad99-fb77391abfb8",
  ]);
  expect(vorbis.NOTES, "vorbis.NOTES").toStrictEqual(["Medieval CUE Splitter (www.medieval.it)"]);
  expect(vorbis.BARCODE, "vorbis.BARCODE").toStrictEqual(["804879313915"]);
  expect(vorbis.ASIN, "vorbis.ASIN").toStrictEqual(["B005NPEUB2"]);
  expect(vorbis.RELEASECOUNTRY, "vorbis.RELEASECOUNTRY").toStrictEqual(["US"]);
  expect(vorbis.RELEASESTATUS, "vorbis.RELEASESTATUS").toStrictEqual(["official"]);

  expect(vorbis.METADATA_BLOCK_PICTURE[0].format, "vorbis.METADATA_BLOCK_PICTURE.format = 'image/jpeg'").toBe(
    "image/jpeg"
  );
  expect(vorbis.METADATA_BLOCK_PICTURE[0].type, "vorbis.METADATA_BLOCK_PICTURE.type = 'Cover (front)'").toBe(
    "Cover (front)"
  ); // ToDo: description??

  expect(vorbis.METADATA_BLOCK_PICTURE[0].description, "vorbis.METADATA_BLOCK_PICTURE.description").toBe("");
  expect(vorbis.METADATA_BLOCK_PICTURE[0].data.length, "vorbis.METADATA_BLOCK_PICTURE.data.length = 98008 bytes").toBe(
    98_008
  );
  expect(calcHash(vorbis.METADATA_BLOCK_PICTURE[0].data), "Picture content").toBe("c57bec49b36ebf422018f82273d1995a");
}

function checkApeTags(APEv2: INativeTagDict) {
  // Compare expectedCommonTags with result.common
  expect(APEv2.Title, "APEv2.Title").toStrictEqual(["Sinner's Prayer"]);
  expect(APEv2.Album, "APEv2.Album").toStrictEqual(["Don't Explain"]);
  expect(APEv2.Year, "APEv2.Year").toStrictEqual(["2011-09-27"]);
  expect(APEv2.Track, "APEv2.Track").toStrictEqual(["1/10"]);
  expect(APEv2.Disc, "APEv2.Disc").toStrictEqual(["1/1"]);
  expect(APEv2.Originalyear, "APEv2.Year").toStrictEqual(["2011"]);
  expect(APEv2.Originaldate, "APEv2.Originaldate").toStrictEqual(["2011-09-26"]);
  expect(APEv2.Label, "APEv2.LABEL").toStrictEqual(["J&R Adventures"]);
  expect(APEv2.CatalogNumber, "APEv2.CatalogNumber").toStrictEqual(["PRAR931391"]);
  expect(APEv2.Acoustid_Id, "APEv2.Acoustid_Id").toStrictEqual(["09c06fac-679a-45b1-8ea0-6ce532318363"]);
  expect(APEv2.Artist, "APEv2.Artist").toStrictEqual(["Beth Hart & Joe Bonamassa"]);
  expect(APEv2.Artists, "APEv2.Artists").toStrictEqual(["Beth Hart", "Joe Bonamassa"]);
  expect(APEv2.Artistsort, "APEv2.Artistsort").toStrictEqual(["Hart, Beth & Bonamassa, Joe"]);
  expect(APEv2["Album Artist"], "APEv2.ALBUMARTIST").toStrictEqual(["Beth Hart & Joe Bonamassa"]);
  expect(APEv2.Albumartistsort, "APEv2.Albumartistsort").toStrictEqual(["Hart, Beth & Bonamassa, Joe"]);
  expect(APEv2.Originaldate, "APEv2.ORIGINALDATE").toStrictEqual(["2011-09-26"]);
  expect(APEv2.Script, "APEv2.Script").toStrictEqual(["Latn"]);
  expect(APEv2.Media, "APEv2.Media").toStrictEqual(["CD"]);
  expect(APEv2.Musicbrainz_Albumid, "APEv2.Musicbrainz_Albumid").toStrictEqual([
    "e7050302-74e6-42e4-aba0-09efd5d431d8",
  ]);
  expect(APEv2.Musicbrainz_Albumartistid, "APEv2.Musicbrainz_Albumartistid").toStrictEqual([
    "3fe817fc-966e-4ece-b00a-76be43e7e73c",
    "984f8239-8fe1-4683-9c54-10ffb14439e9",
  ]);
  expect(APEv2.Musicbrainz_Artistid, "APEv2.Musicbrainz_Artistid").toStrictEqual([
    "3fe817fc-966e-4ece-b00a-76be43e7e73c",
    "984f8239-8fe1-4683-9c54-10ffb14439e9",
  ]);

  expect(APEv2.Performer, "APEv2.Performer").toStrictEqual(performers);
  expect(APEv2.Producer, "APEv2.PRODUCER").toStrictEqual(["Roy Weisman"]);
  expect(APEv2.Engineer, "APEv2.ENGINEER").toStrictEqual(["James McCullagh", "Jared Kvitka"]);
  expect(APEv2.Arranger, "APEv2.ARRANGER").toStrictEqual(["Jeff Bova"]);

  expect(APEv2.Musicbrainz_Albumid, "APEv2.Musicbrainz_Albumid").toStrictEqual([
    "e7050302-74e6-42e4-aba0-09efd5d431d8",
  ]);
  expect(APEv2.musicbrainz_releasetrackid, "APEv2.musicbrainz_releasetrackid").toStrictEqual([
    "d062f484-253c-374b-85f7-89aab45551c7",
  ]);
  expect(APEv2.Musicbrainz_Releasegroupid, "APEv2.Musicbrainz_Releasegroupid").toStrictEqual([
    "e00305af-1c72-469b-9a7c-6dc665ca9adc",
  ]);
  expect(APEv2.musicbrainz_trackid, "APEv2.musicbrainz_trackid").toStrictEqual([
    "f151cb94-c909-46a8-ad99-fb77391abfb8",
  ]);

  // t.deepEqual(APEv2.NOTES, ['Medieval CUE Splitter (www.medieval.it)'], 'APEv2.NOTES')
  expect(APEv2.Barcode, "APEv2.Barcode").toStrictEqual(["804879313915"]);
  // ToDo: not set??? t.deepEqual(APEv2.ASIN, 'B005NPEUB2', 'APEv2.ASIN');
  // ToDo: not set??? t.deepEqual(APEv2.RELEASECOUNTRY, 'GB', 'APEv2.RELEASECOUNTRY');
  expect(APEv2.MUSICBRAINZ_ALBUMSTATUS, "APEv2.MUSICBRAINZ_ALBUMSTATUS").toStrictEqual(["official"]);

  expect(APEv2.Arranger, "APEv2.Arranger").toStrictEqual(["Jeff Bova"]);

  // ToDo:
  expect(APEv2["Cover Art (Front)"][0].format, "picture.format").toBe("image/jpeg");
  expect(APEv2["Cover Art (Front)"][0].description, "picture.description").toBe("front");
  expect(APEv2["Cover Art (Front)"][0].data.length, "picture.data.length").toBe(98_008);

  expect(APEv2["Cover Art (Back)"][0].format, "picture.format").toBe("image/png");
  expect(APEv2["Cover Art (Back)"][0].description, "picture.description").toBe("back");
  expect(APEv2["Cover Art (Back)"][0].data.length, "picture.data.length").toBe(120_291);
}

function checkID3Tags(native: INativeTagDict) {
  expect(native.TIT2, "id3v23.TIT2: Title/songname/content description").toStrictEqual(["Sinner's Prayer"]);
  expect(native.TPE1, "id3v23.TPE1: Lead performer(s)/Soloist(s)").toStrictEqual(["Beth Hart & Joe Bonamassa"]);
  expect(native.TPE2, "id3v23.TPE2: Band/orchestra/accompaniment").toStrictEqual(["Beth Hart & Joe Bonamassa"]);
  expect(native.TALB, "id3v23.TALB: Album/Movie/Show title").toStrictEqual(["Don't Explain"]);
  expect(native.TORY, "id3v23.TORY: Original release year").toStrictEqual(["2011"]);
  expect(native.TYER, "id3v23.TYER").toStrictEqual(["2011"]);
  expect(native.TPOS, "id3v23.TPOS: Part of a set").toStrictEqual(["1/1"]);
  expect(native.TRCK, "id3v23.TRCK: Track number/Position in set").toStrictEqual(["1/10"]);
  expect(native.TPUB, "id3v23.TPUB: Publisher").toStrictEqual(["J&R Adventures"]);
  expect(native.TMED, "id3v23.TMED: Media type").toStrictEqual(["CD"]);
  expect(native.UFID[0], "id3v23.UFID: Unique file identifier").toStrictEqual({
    owner_identifier: "http://musicbrainz.org",
    identifier: Buffer.from("f151cb94-c909-46a8-ad99-fb77391abfb8", "ascii"),
  });

  expect(native.IPLS, "id3v23.IPLS: Involved people list").toStrictEqual([
    {
      arranger: ["Jeff Bova"],
      "bass guitar": ["Carmine Rojas"],
      drums: ["Anton Fig"],
      engineer: ["James McCullagh", "Jared Kvitka"],
      guitar: ["Blondie Chaplin", "Joe Bonamassa"],
      keyboard: ["Arlan Schierbaum"],
      orchestra: ["The Bovaland Orchestra"],
      percussion: ["Anton Fig"],
      piano: ["Beth Hart"],
      producer: ["Roy Weisman"],
      vocals: ["Beth Hart", "Joe Bonamassa"],
    },
  ]);

  expect(native["TXXX:ASIN"], "id3v23.TXXX:ASIN").toStrictEqual(["B005NPEUB2"]);
  expect(native["TXXX:Artists"], "id3v23.TXXX:Artists").toStrictEqual(["Beth Hart", "Joe Bonamassa"]);
  expect(native["TXXX:BARCODE"], "id3v23.TXXX:BARCODE").toStrictEqual(["804879313915"]);
  expect(native["TXXX:CATALOGNUMBER"], "id3v23.TXXX:CATALOGNUMBER").toStrictEqual(["PRAR931391"]);
  expect(native["TXXX:MusicBrainz Album Artist Id"], "id3v23.TXXX:MusicBrainz Album Artist Id").toStrictEqual([
    "3fe817fc-966e-4ece-b00a-76be43e7e73c",
    "984f8239-8fe1-4683-9c54-10ffb14439e9",
  ]);
  expect(native["TXXX:MusicBrainz Album Id"], "id3v23.TXXX:MusicBrainz Album Id").toStrictEqual([
    "e7050302-74e6-42e4-aba0-09efd5d431d8",
  ]);
  // ToDo?? t.strictEqual(id3v23['TXXX:MusicBrainz Album Release Country'], 'GB', 'id3v23.TXXX:MusicBrainz Album Release Country')
  expect(native["TXXX:MusicBrainz Album Status"], "id3v23.TXXX:MusicBrainz Album Status").toStrictEqual(["official"]);
  expect(native["TXXX:MusicBrainz Album Type"], "id3v23.TXXX:MusicBrainz Album Type").toStrictEqual(["album"]);
  expect(native["TXXX:MusicBrainz Artist Id"], "id3v23.TXXX:MusicBrainz Artist Id").toStrictEqual([
    "3fe817fc-966e-4ece-b00a-76be43e7e73c",
    "984f8239-8fe1-4683-9c54-10ffb14439e9",
  ]);
  expect(native["TXXX:MusicBrainz Release Group Id"], "id3v23.TXXX.MusicBrainz Release Group Id").toStrictEqual([
    "e00305af-1c72-469b-9a7c-6dc665ca9adc",
  ]);
  expect(native["TXXX:MusicBrainz Release Track Id"], "id3v23.TXXX.MusicBrainz Release Track Id").toStrictEqual([
    "d062f484-253c-374b-85f7-89aab45551c7",
  ]);
  expect(native["TXXX:SCRIPT"], "id3v23.TXXX:SCRIPT").toStrictEqual(["Latn"]);
  expect(native["TXXX:originalyear"], "id3v23.TXXX:originalyear").toStrictEqual(["2011"]);
  // t.strictEqual(native.METADATA_BLOCK_PICTURE.format, 'image/jpeg', 'native.METADATA_BLOCK_PICTURE format')
  // t.strictEqual(native.METADATA_BLOCK_PICTURE.data.length, 98008, 'native.METADATA_BLOCK_PICTURE length')
}

function checkID3v24Tags(id3v24: INativeTagDict) {
  expect(id3v24.APIC[0].data.length, "id3v24.APIC.data.length").toBe(98_008);
  expect(id3v24.APIC[0].description, "id3v24.APIC.data.description").toBe("");
  expect(id3v24.APIC[0].format, "id3v24.APIC.format = image/jpeg").toBe("image/jpeg");
  expect(id3v24.APIC[0].type, "d3v24.APIC.type = Cover (front)").toBe("Cover (front)");

  expect(id3v24.TALB, "id3v24.TALB: Album/Movie/Show title").toStrictEqual(["Don't Explain"]);
  expect(id3v24.TDOR, "id3v24.TDOR").toStrictEqual(["2011-09-26"]);
  expect(id3v24.TDRC, "id3v24.DATE").toStrictEqual(["2011-09-27"]);

  expect(id3v24.TIPL[0], "event id3v24.TIPL").toStrictEqual({
    arranger: ["Jeff Bova"],
    engineer: ["James McCullagh", "Jared Kvitka"],
    producer: ["Roy Weisman"],
  });

  expect(id3v24.TIT2[0], "id3v24.TIT2: Title/songname/content description").toBe("Sinner's Prayer");

  expect(id3v24.TMCL[0], "event id3v24.TMCL").toStrictEqual({
    "bass guitar": ["Carmine Rojas"],
    drums: ["Anton Fig"],
    guitar: ["Blondie Chaplin", "Joe Bonamassa"],
    keyboard: ["Arlan Schierbaum"],
    orchestra: ["The Bovaland Orchestra"],
    percussion: ["Anton Fig"],
    piano: ["Beth Hart"],
    vocals: ["Beth Hart", "Joe Bonamassa"],
  });

  // Lead performer(s)/Soloist(s)
  expect(id3v24.TMED, "id3v24.TMED").toStrictEqual(["CD"]);
  expect(id3v24.TPE1, "id3v24.TPE1: Lead performer(s)/Soloist(s)").toStrictEqual(["Beth Hart & Joe Bonamassa"]);
  expect(id3v24.TPE2, "id3v24.TPE1: Band/orchestra/accompaniment").toStrictEqual(["Beth Hart & Joe Bonamassa"]);
  expect(id3v24.TPOS, "id3v24.TPOS").toStrictEqual(["1/1"]);
  expect(id3v24.TPUB, "id3v24.TPUB").toStrictEqual(["J&R Adventures"]);
  expect(id3v24.TRCK, "id3v24.TRCK").toStrictEqual(["1/10"]);

  expect(id3v24.TSO2, "TSO2").toStrictEqual(["Hart, Beth & Bonamassa, Joe"]);
  expect(id3v24.TSOP, "TSOP").toStrictEqual(["Hart, Beth & Bonamassa, Joe"]);

  expect(id3v24.UFID[0], "id3v24.UFID: Unique file identifier").toStrictEqual({
    owner_identifier: "http://musicbrainz.org",
    identifier: Buffer.from("f151cb94-c909-46a8-ad99-fb77391abfb8", "ascii"),
  });

  expect(id3v24["TXXX:ASIN"], "id3v24.TXXX:ASIN").toStrictEqual(["B005NPEUB2"]);
  expect(id3v24["TXXX:Artists"], "id3v24.TXXX:Artists").toStrictEqual(["Beth Hart", "Joe Bonamassa"]);
  expect(id3v24["TXXX:BARCODE"], "id3v24.TXXX:BARCODE").toStrictEqual(["804879313915"]);
  expect(id3v24["TXXX:CATALOGNUMBER"], "id3v24.TXXX:CATALOGNUMBER").toStrictEqual(["PRAR931391"]);
  expect(id3v24["TXXX:MusicBrainz Album Artist Id"], "id3v24.TXXX:MusicBrainz Album Artist Id").toStrictEqual([
    "3fe817fc-966e-4ece-b00a-76be43e7e73c",
    "984f8239-8fe1-4683-9c54-10ffb14439e9",
  ]);
  expect(id3v24["TXXX:MusicBrainz Album Id"], "id3v24.TXXX:MusicBrainz Album Id").toStrictEqual([
    "e7050302-74e6-42e4-aba0-09efd5d431d8",
  ]);
  // ToDo?? t.deepEqual(id3v24['TXXX:MusicBrainz Album Release Country'], 'GB', 'id3v24.TXXX:MusicBrainz Album Release Country');
  expect(id3v24["TXXX:MusicBrainz Album Status"], "id3v24.TXXX:MusicBrainz Album Status").toStrictEqual(["official"]);
  expect(id3v24["TXXX:MusicBrainz Album Type"], "id3v24.TXXX:MusicBrainz Album Type").toStrictEqual(["album"]);
  expect(id3v24["TXXX:MusicBrainz Artist Id"], "id3v24.TXXX:MusicBrainz Artist Id").toStrictEqual([
    "3fe817fc-966e-4ece-b00a-76be43e7e73c",
    "984f8239-8fe1-4683-9c54-10ffb14439e9",
  ]);
  expect(id3v24["TXXX:MusicBrainz Release Group Id"], "id3v24.TXXX.MusicBrainz Release Group Id").toStrictEqual([
    "e00305af-1c72-469b-9a7c-6dc665ca9adc",
  ]);
  expect(id3v24["TXXX:MusicBrainz Release Track Id"], "id3v24.TXXX.MusicBrainz Release Track Id").toStrictEqual([
    "d062f484-253c-374b-85f7-89aab45551c7",
  ]);
  expect(id3v24["TXXX:SCRIPT"], "id3v24.TXXX:SCRIPT").toStrictEqual(["Latn"]);
  expect(id3v24["TXXX:originalyear"], "id3v24.TXXX:originalyear").toStrictEqual(["2011"]);
}

function checkITunesTags(iTunes: INativeTagDict) {
  expect(iTunes["©nam"], "iTunes.©nam => common.title").toStrictEqual(["Sinner's Prayer"]);
  expect(iTunes["©ART"], "iTunes.@ART => common.artist").toStrictEqual(["Beth Hart & Joe Bonamassa"]);
  expect(iTunes["©alb"], "iTunes.©alb => common.album").toStrictEqual(["Don't Explain"]);
  expect(iTunes.soar, "iTunes.soar => common.artistsort").toStrictEqual(["Hart, Beth & Bonamassa, Joe"]);
  expect(iTunes.soaa, "iTunes.soaa => common.albumartistsort").toStrictEqual(["Hart, Beth & Bonamassa, Joe"]);
  expect(
    iTunes["----:com.apple.iTunes:ARTISTS"],
    "iTunes.----:com.apple.iTunes:ARTISTS => common.artists"
  ).toStrictEqual(["Beth Hart", "Joe Bonamassa"]);
  expect(iTunes.aART, "iTunes.aART => common.albumartist").toStrictEqual(["Beth Hart & Joe Bonamassa"]);
  expect(iTunes["----:com.apple.iTunes:Band"], "iTunes.----:com.apple.iTunes:Band => common.albumartist").toStrictEqual(
    ["Beth Hart & Joe Bonamassa"]
  );
  expect(iTunes.trkn, "iTunes.trkn => common.track").toStrictEqual(["1/10"]);
  expect(iTunes.disk, "iTunes.trkn => common.disk").toStrictEqual(["1/1"]);
  expect(
    iTunes["----:com.apple.iTunes:ORIGINALDATE"],
    "iTunes.----:com.apple.iTunes:ORIGINALDATE => common.albumartistsort"
  ).toStrictEqual(["2011-09-26"]);
  expect(
    iTunes["----:com.apple.iTunes:ORIGINALYEAR"],
    "iTunes.----:com.apple.iTunes:ORIGINALDATE => common.originalyear"
  ).toStrictEqual(["2011"]);

  expect(iTunes["----:com.apple.iTunes:ACOUSTID_ID"]).toStrictEqual(["09c06fac-679a-45b1-8ea0-6ce532318363"]);
  expect(iTunes["----:com.apple.iTunes:ARRANGER"]).toStrictEqual(["Jeff Bova"]);

  expect(iTunes["----:com.apple.iTunes:NOTES"]).toStrictEqual(["Medieval CUE Splitter (www.medieval.it)"]);
  // ToDO
}

function checkAsfTags(native: INativeTagDict) {
  expect(
    native["WM/AlbumArtist"],
    "asf.WM/AlbumArtist => common.albumartist = 'Beth Hart & Joe Bonamassa'"
  ).toStrictEqual(["Beth Hart & Joe Bonamassa"]);
  expect(native["WM/AlbumTitle"], "asf.WM/AlbumTitle => common.albumtitle = 'Don't Explain'").toStrictEqual([
    "Don't Explain",
  ]);
  expect(native["WM/ARTISTS"], "asf.WM/ARTISTS => common.artists = ['Joe Bonamassa', 'Beth Hart']").toStrictEqual([
    "Joe Bonamassa",
    "Beth Hart",
  ]);
  expect(native["WM/Picture"], "Contains WM/Picture").toBeDefined();
  expect(native["WM/Picture"].length, "Contains 1 WM/Picture").toBe(1);
  // ToDO
}

describe("Vorbis mappings", () => {
  test("should map FLAC/Vorbis", async () => {
    const filename = "MusicBrainz - Beth Hart - Sinner's Prayer.flac";

    // Parse flac/Vorbis file
    const metadata = await parseFile(join(samplePath, filename));
    expect(metadata, "should return metadata").toBeDefined();
    expect(metadata.native, "should return metadata.native").toBeDefined();
    expect(metadata.native.vorbis, "should return metadata.native.vorbis").toBeDefined();

    const format = metadata.format;
    expect(format.container, "format.container").toBe("FLAC");
    expect(format.codec, "format.codec").toBe("FLAC");
    expect(format.duration, "format.duration = 2.123 seconds").toBe(2.122_993_197_278_911_6);
    expect(format.sampleRate, "format.sampleRate = 44100 samples/sec").toBe(44_100);
    expect(format.bitsPerSample, "format.bitsPerSample = 16 bits").toBe(16);
    expect(format.numberOfChannels, "format.numberOfChannels = 2 channels").toBe(2);

    checkVorbisTags(orderTags(metadata.native.vorbis));
    checkCommonMapping("vorbis", metadata.common);
  });

  test("should map ogg/Vorbis", async () => {
    const filePath = join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer.ogg");

    // Parse ogg/Vorbis file
    const metadata = await parseFile(filePath);
    expect(metadata, "should return metadata").toBeDefined();
    expect(metadata.native, "should return metadata.native").toBeDefined();
    expect(metadata.native.vorbis, "should return metadata.native.vorbis").toBeDefined();
    // Check Vorbis native tags
    checkVorbisTags(orderTags(metadata.native.vorbis));
    // Check common mappings
    checkCommonMapping("vorbis", metadata.common);
  });
});

describe("APEv2 header", () => {
  test("should map Monkey's Audio / APEv2", async () => {
    const filePath = join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer.ape");

    // Run with default options
    const metadata = await parseFile(filePath);
    expect(metadata, "should return metadata").toBeDefined();
    expect(metadata.native, "should return metadata.native").toBeDefined();
    expect(metadata.native.APEv2, "should include native APEv2 tags").toBeDefined();

    const format = metadata.format;
    expect(format.duration, "format.duration = 2.123 seconds").toBe(2.122_993_197_278_911_6);
    expect(format.sampleRate, "format.sampleRate").toBe(44_100);
    expect(format.sampleRate, "format.sampleRate").toBe(44_100);
    expect(format.bitsPerSample, "format.bitsPerSample").toBe(16);
    expect(format.numberOfChannels, "format.numberOfChannels").toBe(2);

    checkApeTags(orderTags(metadata.native.APEv2));
    checkCommonMapping("APEv2", metadata.common);
  });

  test("should map WavPack / APEv2", async () => {
    const filePath = join(samplePath, "wavpack", "MusicBrainz - Beth Hart - Sinner's Prayer.wv");

    // Run with default options
    const metadata = await parseFile(filePath);
    expect(metadata, "should return metadata").toBeDefined();
    expect(metadata.native, "should return metadata.native").toBeDefined();
    expect(metadata.native.APEv2, "should include native APEv2 tags").toBeDefined();

    const format = metadata.format;
    expect(format.duration, "format.duration = 2.123 seconds").toBe(2.122_993_197_278_911_6);
    expect(format.sampleRate, "format.sampleRate").toBe(44_100);
    expect(format.sampleRate, "format.sampleRate").toBe(44_100);
    expect(format.bitsPerSample, "format.bitsPerSample").toBe(16);
    expect(format.numberOfChannels, "format.numberOfChannels").toBe(2);

    checkApeTags(orderTags(metadata.native.APEv2));
    checkCommonMapping("APEv2", metadata.common);
  });
});

describe("ID3v2.3 header", () => {
  test("MP3 / ID3v2.3", async () => {
    const filePath = join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].V2.mp3");

    // Run with default options
    const metadata = await parseFile(filePath);
    expect(metadata, "should return metadata").toBeDefined();
    expect(metadata.native, "should return metadata.native").toBeDefined();
    expect(metadata.native["ID3v2.3"], "should include native id3v2.3 tags").toBeDefined();

    const format = metadata.format;
    expect(format.tagTypes, "format.tagTypes").toStrictEqual(["ID3v2.3"]);
    expect(format.container, "format.container").toBe("MPEG");
    expect(format.codec, "format.codec").toBe("MPEG 1 Layer 3");
    expect(format.duration, "format.duration").toBe(2.168_163_265_306_122_2);
    expect(format.sampleRate, "format.sampleRate").toBe(44_100);
    expect(format.numberOfChannels, "format.numberOfChannels").toBe(2);
    expect(format.codecProfile, "format.codecProfile").toBe("V2");
    expect(format.tool, "format.tool").toBe("LAME 3.99r");

    checkID3Tags(orderTags(metadata.native["ID3v2.3"]));
    checkCommonMapping("ID3v2.3", metadata.common);
  });

  /**
   * Looks like RIFF/WAV not fully supported yet in MusicBrainz Picard: https://tickets.metabrainz.org/browse/PICARD-653?jql=text%20~%20%22RIFF%22.
   * This file has been fixed with Mp3Tag to have a valid ID3v2.3 tag
   */
  test("should map RIFF/WAVE/PCM / ID3v2.3", async () => {
    const filePath = join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].wav");

    // Parse wma/asf file
    const result = await parseFile(filePath);
    // Check wma format
    const format = result.format;
    // t.strictEqual(format.container, "WAVE", "format.container = WAVE PCM");
    expect(format.tagTypes, "format.tagTypes)").toStrictEqual(["exif", "ID3v2.3"]);
    expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(44_100);
    expect(format.bitsPerSample, "format.bitsPerSample = 16 bits").toBe(16);
    expect(format.numberOfChannels, "format.numberOfChannels = 2 channels").toBe(2);
    expect(format.numberOfSamples, "format.numberOfSamples = 88200").toBe(93_624);
    expect(format.duration, "format.duration = 2 seconds").toBe(2.122_993_197_278_911_6);
    // Check native tags
    checkID3Tags(orderTags(result.native["ID3v2.3"]));
    checkCommonMapping("ID3v2.3", result.common);
  });
});

describe("ID3v2.4 header", () => {
  test("should map MP3/ID3v2.4 header", async () => {
    const filePath = join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].V2.mp3");

    // Run with default options
    const metadata = await parseFile(filePath);

    expect(metadata, "should return metadata").toBeDefined();
    expect(metadata.native, "should return metadata.native").toBeDefined();
    expect(metadata.native["ID3v2.4"], "should include native id3v2.4 tags").toBeDefined();

    const format = metadata.format;
    expect(format.tagTypes, "format.tagTypes").toStrictEqual(["ID3v2.4"]);
    expect(format.container, "format.container").toBe("MPEG");
    expect(format.codec, "format.codec").toBe("MPEG 1 Layer 3");
    expect(format.codecProfile, "format.codecProfile = V2").toBe("V2");
    expect(format.tool, "format.tool").toBe("LAME 3.99r");
    expect(format.duration, "format.duration").toBe(2.168_163_265_306_122_2);
    expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(44_100);
    expect(format.numberOfChannels, "format.numberOfChannels").toBe(2);

    checkID3v24Tags(orderTags(metadata.native["ID3v2.4"]));
    checkCommonMapping("ID3v2.4", metadata.common);
  });

  test("should parse AIFF/ID3v2.4 audio file", async () => {
    const filePath = join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].aiff");

    // Parse wma/asf file
    const metadata = await parseFile(filePath);
    expect(metadata, "should return metadata").toBeDefined();
    expect(metadata.native, "should return metadata.native").toBeDefined();
    expect(metadata.native["ID3v2.4"], "should include native id3v2.4 tags").toBeDefined();
    // Check wma format
    const format = metadata.format;
    expect(format.container, "format.container = 'AIFF'").toBe("AIFF");
    expect(format.tagTypes, "format.tagTypes = 'ID3v2.4'").toStrictEqual(["ID3v2.4"]); // ToDo
    expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(44_100);
    expect(format.bitsPerSample, "format.bitsPerSample = 16 bits").toBe(16);
    expect(format.numberOfChannels, "format.numberOfChannels = 2 channels").toBe(2);
    expect(format.numberOfSamples, "format.bitsPerSample = 93624").toBe(93_624);
    expect(format.duration, "format.duration = ~2.123").toBe(2.122_993_197_278_911_6);

    // Check ID3v2.4 native tags
    checkID3v24Tags(orderTags(metadata.native["ID3v2.4"]));
    // Check common tag mappings
    checkCommonMapping("ID3v2.4", metadata.common);
  });
});

test("should map M4A / (Apple) iTunes header", async () => {
  const filePath = join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer.m4a");

  // Run with default options
  const metadata = await parseFile(filePath);
  expect(metadata, "should return metadata").toBeDefined();
  expect(metadata.native, "should return metadata.native").toBeDefined();
  expect(metadata.native.iTunes, "should include native iTunes tags").toBeDefined();

  const format = metadata.format;
  expect(format.tagTypes, "format.tagTypes").toStrictEqual(["iTunes"]);
  expect(format.container, "format.container").toBe("M4A/mp42/isom");
  expect(format.codec, "format.codec").toBe("ALAC");
  expect(format.lossless, "ALAC is a lossless format").toBe(true);
  expect(format.duration, "format.duration").toBe(2.122_993_197_278_911_6);
  expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(44_100);
  // t.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample'); // ToDo
  // t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels'); // ToDo

  const common = metadata.common;
  expect(common.picture[0].format, "picture format").toBe("image/jpeg");
  expect(common.picture[0].data.length, "picture length").toBe(98_008);

  checkITunesTags(orderTags(metadata.native.iTunes));
  checkCommonMapping("iTunes", metadata.common);
});

test("should map WMA/ASF header", async () => {
  const filePath = join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer.wma");

  // Parse wma/asf file
  const metadata = await parseFile(filePath);

  expect(metadata, "should return metadata").toBeDefined();
  expect(metadata.native, "should return metadata.native").toBeDefined();
  expect(metadata.native.asf, "should include native asf tags").toBeDefined();

  // Check wma format
  const format = metadata.format;
  expect(format.tagTypes, "format.tagTypes = asf").toStrictEqual(["asf"]);
  expect(format.bitrate, "format.bitrate = 320000").toBe(320_000);
  // expect(format.container, "format.container = wma").toBe("wma"); // ToDo
  expect(format.duration, "format.duration").toBeCloseTo(2.135, 4);
  // expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(44_100); // ToDo
  // expect(format.bitsPerSample, "format.bitsPerSample").toBe(16); // ToDo
  // expect(format.numberOfChannels, "format.numberOfChannels").toBe(2); // ToDo

  // Check asf native tags
  checkAsfTags(orderTags(metadata.native.asf));
  // Check common tag mappings
  // TODO
  // checkCommonMapping(metadata.format.tagTypes[0], metadata.common);
});
