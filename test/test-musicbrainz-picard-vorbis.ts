import { assert, it } from "vitest";
import * as path from "node:path";

import * as mm from "../lib";
import { samplePath } from "./util";

it("MusicBrains/Picard tags in FLAC", async () => {
  const filename = "MusicBrainz-Picard-tags.flac";
  const filePath = path.join(samplePath, filename);

  function checkFormat(format: mm.IFormat) {
    assert.deepEqual(format.duration, 271.773_333_333_333_3, "format.duration");
    assert.deepEqual(format.sampleRate, 44_100, "format.sampleRate");
    assert.deepEqual(format.bitsPerSample, 16, "format.bitsPerSample");
    assert.deepEqual(format.numberOfChannels, 2, "format.numberOfChannels");
  }

  function checkCommonTags(common: mm.ICommonTagsResult) {
    // Compare expectedCommonTags with result.common
    assert.deepEqual(common.title, "Brian Eno", "common.tagtitle");
    assert.deepEqual(common.artist, "MGMT", "common.artist");
    assert.deepEqual(common.artists, ["MGMT"], "common.artist");
    assert.deepEqual(common.albumartist, "MGMT", "common.albumartist");
    assert.deepEqual(
      common.album,
      "Oracular Spectacular / Congratulations",
      "common.album"
    );
    assert.deepEqual(common.track, { no: 7, of: 9 }, "common.track");
    assert.deepEqual(common.disk, { no: 2, of: 2 }, "common.disk");
    assert.deepEqual(
      common.discsubtitle,
      "Cogratulations" as unknown as string[],
      "common.discsubtitle"
    );
    assert.deepEqual(common.date, "2011-09-11", "common.date");
    assert.deepEqual(common.year, 2011, "common.year");
    assert.deepEqual(common.releasecountry, "XE", "common.releasecountry");
    assert.deepEqual(common.asin, "B0055U9LNC", "common.asin");
    assert.deepEqual(common.barcode, "886979357723", "common.barcode");
    assert.deepEqual(common.label, ["Sony Music"], "common.label");
    assert.deepEqual(
      common.catalognumber,
      ["88697935772"],
      "common.catalognumber"
    );
    assert.deepEqual(common.originalyear, 2011, "common.originalyear");
    assert.deepEqual(common.originaldate, "2011-09-11", "common.originaldate");
    assert.deepEqual(common.releasestatus, "official", "common.releasestatus");
    assert.deepEqual(
      common.releasetype,
      ["album", "compilation"],
      "common.releasetype"
    );
    assert.deepEqual(common.comment, ["EAC-Secure Mode"], "common.comment");
    assert.deepEqual(common.genre, ["Alt. Rock"], "common.genre");
    assert.deepEqual(
      common.musicbrainz_albumid,
      "6032dfc4-8880-4fea-b1c0-aaee52e1113c",
      "common.musicbrainz_albumid"
    );
    assert.deepEqual(
      common.musicbrainz_recordingid,
      "b0c1d984-ba93-4167-880a-ac02255bf9e7",
      "common.musicbrainz_recordingid"
    );
    assert.deepEqual(
      common.musicbrainz_albumartistid,
      ["c485632c-b784-4ee9-8ea1-c5fb365681fc"],
      "common.musicbrainz_albumartistid"
    );
    assert.deepEqual(
      common.musicbrainz_artistid,
      ["c485632c-b784-4ee9-8ea1-c5fb365681fc"],
      "common.musicbrainz_artistid"
    );
    assert.deepEqual(
      common.musicbrainz_releasegroupid,
      "9a3237f4-c2a5-467f-9a8e-fe1d247ff520",
      "common.musicbrainz_releasegroupid"
    );
    assert.deepEqual(
      common.musicbrainz_trackid,
      "0f53f7a3-89df-4069-9357-d04252239b6d",
      "common.musicbrainz_trackid"
    );

    assert.isDefined(common.picture, "common.picture");
    assert.deepEqual(common.picture[0].format, "image/jpeg", "picture format");
    assert.deepEqual(common.picture[0].data.length, 175_668, "picture length");
  }

  function checkNativeTags(vorbis: mm.INativeTagDict) {
    // Compare expectedCommonTags with result.vorbis
    assert.deepEqual(vorbis.TITLE, ["Brian Eno"], "vorbis: .TITLE");
    assert.deepEqual(vorbis.ARTIST, ["MGMT"], "vorbis: artist");
    assert.deepEqual(vorbis.ARTISTS, ["MGMT"], "vorbis: artist");
    assert.deepEqual(vorbis.ALBUMARTIST, ["MGMT"], "vorbis: albumartist");
    assert.deepEqual(
      vorbis.ALBUM,
      ["Oracular Spectacular / Congratulations"],
      "vorbis: album"
    );
    assert.deepEqual(vorbis.TRACKNUMBER, ["7"], "vorbis: TRACK");
    assert.deepEqual(vorbis.TRACKTOTAL, ["9"], "vorbis: TRACKTOTAL");
    assert.deepEqual(vorbis.DISCNUMBER, ["2"], "vorbis: DISCNUMBER");
    assert.deepEqual(vorbis.DISCTOTAL, ["2"], "vorbis: DISCTOTAL");
    assert.deepEqual(
      vorbis.DISCSUBTITLE,
      ["Cogratulations"],
      "vorbis: DISCSUBTITLE"
    );
    assert.deepEqual(vorbis.DATE, ["2011-09-11"], "vorbis: DATE");
    assert.deepEqual(vorbis.RELEASECOUNTRY, ["XE"], "vorbis: RELEASECOUNTRY");
    assert.deepEqual(vorbis.ASIN, ["B0055U9LNC"], "vorbis: ASIN");
    assert.deepEqual(vorbis.BARCODE, ["886979357723"], "vorbis: BARCODE");
    assert.deepEqual(vorbis.LABEL, ["Sony Music"], "vorbis: LABEL");
    assert.deepEqual(
      vorbis.CATALOGNUMBER,
      ["88697935772"],
      "vorbis: CATALOGNUMBER"
    );
    assert.deepEqual(vorbis.ORIGINALYEAR, ["2011"], "vorbis: ORIGINALYEAR");
    assert.deepEqual(
      vorbis.ORIGINALDATE,
      ["2011-09-11"],
      "vorbis: ORIGINALDATE"
    );
    assert.deepEqual(
      vorbis.RELEASESTATUS,
      ["official"],
      "vorbis: RELEASESTATUS"
    );
    assert.deepEqual(
      vorbis.RELEASETYPE,
      ["album", "compilation"],
      "vorbis: RELEASETYPE"
    );
    assert.deepEqual(vorbis.COMMENT, ["EAC-Secure Mode"], "vorbis: COMMENT");
    assert.deepEqual(vorbis.GENRE, ["Alt. Rock"], "vorbis: GENRE");
    assert.deepEqual(
      vorbis.MUSICBRAINZ_ALBUMID,
      ["6032dfc4-8880-4fea-b1c0-aaee52e1113c"],
      "vorbis: MUSICBRAINZ_ALBUMID"
    );
    assert.deepEqual(
      vorbis.MUSICBRAINZ_TRACKID,
      ["b0c1d984-ba93-4167-880a-ac02255bf9e7"],
      "vorbis: MUSICBRAINZ_RECORDINGID"
    );
    assert.deepEqual(
      vorbis.MUSICBRAINZ_ALBUMARTISTID,
      ["c485632c-b784-4ee9-8ea1-c5fb365681fc"],
      "vorbis: MUSICBRAINZ_ALBUMARTISTID"
    );
    assert.deepEqual(
      vorbis.MUSICBRAINZ_ARTISTID,
      ["c485632c-b784-4ee9-8ea1-c5fb365681fc"],
      "vorbis: MUSICBRAINZ_ARTISTID"
    );
    assert.deepEqual(
      vorbis.MUSICBRAINZ_RELEASEGROUPID,
      ["9a3237f4-c2a5-467f-9a8e-fe1d247ff520"],
      "vorbis: MUSICBRAINZ_RELEASEGROUPID"
    );
    assert.deepEqual(
      vorbis.MUSICBRAINZ_RELEASETRACKID,
      ["0f53f7a3-89df-4069-9357-d04252239b6d"],
      "vorbis: MUSICBRAINZ_RELEASETRACKID"
    );

    // t.deepEqual(common.picture[ 0 ].format, 'jpg', 'picture format')
    // i.deepEqual(common.picture[ 0 ].data.length, 175668, 'picture length')
  }

  // Run with default options
  const metadata = await mm.parseFile(filePath);
  assert.isDefined(metadata, "metadata");
  assert.isDefined(metadata.common, "should include common tags");
  assert.isDefined(metadata.native, "metadata.common");
  assert.isDefined(metadata.native.vorbis, "should include native Vorbis tags");
  checkFormat(metadata.format);
  checkNativeTags(mm.orderTags(metadata.native.vorbis));
  checkCommonTags(metadata.common);
});
