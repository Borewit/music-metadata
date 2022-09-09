import { expect, test } from "vitest";
import { join } from "node:path";

import { orderTags } from "../lib";
import { samplePath } from "./util";
import { Parsers } from "./metadata-parsers";

test.each(Parsers)("MusicBrains/Picard tags in FLAC", async (parser) => {
  const filename = "MusicBrainz-Picard-tags.flac";
  const filePath = join(samplePath, filename);

  // Run with default options
  const metadata = await parser.initParser(filePath);

  expect(metadata, "metadata").toBeDefined();
  expect(metadata.common, "should include common tags").toBeDefined();
  expect(metadata.native, "metadata.common").toBeDefined();
  expect(metadata.native.vorbis, "should include native Vorbis tags").toBeDefined();

  const format = metadata.format;
  const common = metadata.common;
  const native = orderTags(metadata.native.vorbis);

  expect(format.duration, "format.duration").toBe(271.773_333_333_333_3);
  expect(format.sampleRate, "format.sampleRate").toBe(44_100);
  expect(format.bitsPerSample, "format.bitsPerSample").toBe(16);
  expect(format.numberOfChannels, "format.numberOfChannels").toBe(2);

  // Compare expectedCommonTags with result.common
  expect(common.title, "common.tagtitle").toBe("Brian Eno");
  expect(common.artist, "common.artist").toBe("MGMT");
  expect(common.artists, "common.artist").toStrictEqual(["MGMT"]);
  expect(common.albumartist, "common.albumartist").toBe("MGMT");
  expect(common.album, "common.album").toBe("Oracular Spectacular / Congratulations");
  expect(common.track, "common.track").toStrictEqual({ no: 7, of: 9 });
  expect(common.disk, "common.disk").toStrictEqual({ no: 2, of: 2 });
  expect(common.discsubtitle, "common.discsubtitle").toBe("Cogratulations");
  expect(common.date, "common.date").toBe("2011-09-11");
  expect(common.year, "common.year").toBe(2011);
  expect(common.releasecountry, "common.releasecountry").toBe("XE");
  expect(common.asin, "common.asin").toBe("B0055U9LNC");
  expect(common.barcode, "common.barcode").toBe("886979357723");
  expect(common.label, "common.label").toStrictEqual(["Sony Music"]);
  expect(common.catalognumber, "common.catalognumber").toStrictEqual(["88697935772"]);
  expect(common.originalyear, "common.originalyear").toBe(2011);
  expect(common.originaldate, "common.originaldate").toBe("2011-09-11");
  expect(common.releasestatus, "common.releasestatus").toBe("official");
  expect(common.releasetype, "common.releasetype").toStrictEqual(["album", "compilation"]);
  expect(common.comment, "common.comment").toStrictEqual(["EAC-Secure Mode"]);
  expect(common.genre, "common.genre").toStrictEqual(["Alt. Rock"]);
  expect(common.musicbrainz_albumid, "common.musicbrainz_albumid").toBe("6032dfc4-8880-4fea-b1c0-aaee52e1113c");
  expect(common.musicbrainz_recordingid, "common.musicbrainz_recordingid").toBe("b0c1d984-ba93-4167-880a-ac02255bf9e7");
  expect(common.musicbrainz_albumartistid, "common.musicbrainz_albumartistid").toStrictEqual([
    "c485632c-b784-4ee9-8ea1-c5fb365681fc",
  ]);
  expect(common.musicbrainz_artistid, "common.musicbrainz_artistid").toStrictEqual([
    "c485632c-b784-4ee9-8ea1-c5fb365681fc",
  ]);
  expect(common.musicbrainz_releasegroupid, "common.musicbrainz_releasegroupid").toBe(
    "9a3237f4-c2a5-467f-9a8e-fe1d247ff520"
  );
  expect(common.musicbrainz_trackid, "common.musicbrainz_trackid").toBe("0f53f7a3-89df-4069-9357-d04252239b6d");

  expect(common.picture, "common.picture").toBeDefined();
  expect(common.picture[0].format, "picture format").toBe("image/jpeg");
  expect(common.picture[0].data.length, "picture length").toBe(175_668);

  // Compare expectedCommonTags with result.vorbis
  expect(native.TITLE, "vorbis: .TITLE").toStrictEqual(["Brian Eno"]);
  expect(native.ARTIST, "vorbis: artist").toStrictEqual(["MGMT"]);
  expect(native.ARTISTS, "vorbis: artist").toStrictEqual(["MGMT"]);
  expect(native.ALBUMARTIST, "vorbis: albumartist").toStrictEqual(["MGMT"]);
  expect(native.ALBUM, "vorbis: album").toStrictEqual(["Oracular Spectacular / Congratulations"]);
  expect(native.TRACKNUMBER, "vorbis: TRACK").toStrictEqual(["7"]);
  expect(native.TRACKTOTAL, "vorbis: TRACKTOTAL").toStrictEqual(["9"]);
  expect(native.DISCNUMBER, "vorbis: DISCNUMBER").toStrictEqual(["2"]);
  expect(native.DISCTOTAL, "vorbis: DISCTOTAL").toStrictEqual(["2"]);
  expect(native.DISCSUBTITLE, "vorbis: DISCSUBTITLE").toStrictEqual(["Cogratulations"]);
  expect(native.DATE, "vorbis: DATE").toStrictEqual(["2011-09-11"]);
  expect(native.RELEASECOUNTRY, "vorbis: RELEASECOUNTRY").toStrictEqual(["XE"]);
  expect(native.ASIN, "vorbis: ASIN").toStrictEqual(["B0055U9LNC"]);
  expect(native.BARCODE, "vorbis: BARCODE").toStrictEqual(["886979357723"]);
  expect(native.LABEL, "vorbis: LABEL").toStrictEqual(["Sony Music"]);
  expect(native.CATALOGNUMBER, "vorbis: CATALOGNUMBER").toStrictEqual(["88697935772"]);
  expect(native.ORIGINALYEAR, "vorbis: ORIGINALYEAR").toStrictEqual(["2011"]);
  expect(native.ORIGINALDATE, "vorbis: ORIGINALDATE").toStrictEqual(["2011-09-11"]);
  expect(native.RELEASESTATUS, "vorbis: RELEASESTATUS").toStrictEqual(["official"]);
  expect(native.RELEASETYPE, "vorbis: RELEASETYPE").toStrictEqual(["album", "compilation"]);
  expect(native.COMMENT, "vorbis: COMMENT").toStrictEqual(["EAC-Secure Mode"]);
  expect(native.GENRE, "vorbis: GENRE").toStrictEqual(["Alt. Rock"]);
  expect(native.MUSICBRAINZ_ALBUMID, "vorbis: MUSICBRAINZ_ALBUMID").toStrictEqual([
    "6032dfc4-8880-4fea-b1c0-aaee52e1113c",
  ]);
  expect(native.MUSICBRAINZ_TRACKID, "vorbis: MUSICBRAINZ_RECORDINGID").toStrictEqual([
    "b0c1d984-ba93-4167-880a-ac02255bf9e7",
  ]);
  expect(native.MUSICBRAINZ_ALBUMARTISTID, "vorbis: MUSICBRAINZ_ALBUMARTISTID").toStrictEqual([
    "c485632c-b784-4ee9-8ea1-c5fb365681fc",
  ]);
  expect(native.MUSICBRAINZ_ARTISTID, "vorbis: MUSICBRAINZ_ARTISTID").toStrictEqual([
    "c485632c-b784-4ee9-8ea1-c5fb365681fc",
  ]);
  expect(native.MUSICBRAINZ_RELEASEGROUPID, "vorbis: MUSICBRAINZ_RELEASEGROUPID").toStrictEqual([
    "9a3237f4-c2a5-467f-9a8e-fe1d247ff520",
  ]);
  expect(native.MUSICBRAINZ_RELEASETRACKID, "vorbis: MUSICBRAINZ_RELEASETRACKID").toStrictEqual([
    "0f53f7a3-89df-4069-9357-d04252239b6d",
  ]);

  // t.deepEqual(common.picture[ 0 ].format, 'jpg', 'picture format')
  // i.deepEqual(common.picture[ 0 ].data.length, 175668, 'picture length')
});
