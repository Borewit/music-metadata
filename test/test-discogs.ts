import {assert} from "chai";
import * as mm from "../src";

import * as path from "path";
import {ID3v24TagMapper} from "../src/id3v2/ID3v24TagMapper";
import {VorbisTagMapper} from "../src/ogg/vorbis/VorbisTagMapper";
import {IAudioMetadata} from '../src/type';

const t = assert;

describe("Discogs mappings", () => {

  const discogs_tags = [
    "DISCOGS_ARTIST_ID",
    "DISCOGS_ARTISTS",
    "DISCOGS_ARTIST_NAME",
    "DISCOGS_ALBUM_ARTISTS",
    "DISCOGS_CATALOG",
    "DISCOGS_COUNTRY",
    "DISCOGS_DATE",
    "DISCOGS_LABEL",
    "DISCOGS_LABEL_ID",
    "DISCOGS_MASTER_RELEASE_ID",
    "DISCOGS_RATING",
    "DISCOGS_RELEASED",
    "DISCOGS_RELEASE_ID",
    "DISCOGS_VOTES"];

  describe("Mapping definitions", () => {

    it("should map ID3v2.3/ID3v2.4 tags", () => {

      const mapper = new ID3v24TagMapper();

      // Each Discogs tag should be mapped
      for (const tag of discogs_tags) {
        const tagName = 'TXXX:' + tag;
        assert.isDefined(mapper.tagMap[tagName], "Discogs/ID3v2.4 tag: " + tagName);
      }
    });

    it("should map Vorbis/FLAC tags", () => {

      const mapper = new VorbisTagMapper();

      // Each Discogs tag should be mapped
      for (const tag of discogs_tags) {
        assert.isDefined(mapper.tagMap[tag], "Discog/Vorbis tag: " + tag);
      }
    });
  });

  describe("Track mapping: Beth Hart - Sinner's Prayer", () => {

    function checkTags(metadata: IAudioMetadata, tagType, getTagName: (tag: string) => string) {

      const native = mm.orderTags(metadata.native[tagType]);
      const common = metadata.common;

      let tagName: string;

      // Expect basic common tags
      t.deepEqual(common.album, "Don't Explain", "common.album");
      t.deepEqual(common.artist, "Beth Hart, Joe Bonamassa", "common.artist");

      // Check discogs, DISCOGS_RELEASE_ID
      tagName = getTagName("DISCOGS_RELEASE_ID");
      t.deepEqual(native[tagName], ["4204665"], tagType + "/" + tagName);
      t.strictEqual(common.discogs_release_id, 4204665, +tagType + "/" + tagName + " => common.discogs_release_id");

      // Check Discogs-tag: DISCOGS_ARTIST_ID
      tagName = getTagName("DISCOGS_ARTIST_ID");
      t.deepEqual(native[tagName], ["389157", "900313"], tagType + "/" + tagName);
      t.deepEqual(common.discogs_artist_id, [389157, 900313], tagType + "/" + tagName + " => common.discogs_artist_id");

      // Check Discogs-tag: DISCOGS_ALBUM_ARTISTS
      tagName = getTagName("DISCOGS_ALBUM_ARTISTS");
      t.deepEqual(native[tagName], ["Beth Hart", "Joe Bonamassa"], tagType + "/" + tagName);
      t.deepEqual(common.artists, ["Beth Hart", "Joe Bonamassa"], tagType + "/" + tagName + " => common.artists");

      // Check Discogs-tag: DISCOGS_VOTES
      tagName = getTagName("DISCOGS_VOTES");
      t.deepEqual(native[tagName], ["9"], tagType + "/" + tagName);
      t.deepEqual(common.discogs_votes, 9, tagType + "/" + tagName + " => common.discogs_votes");

      // Check Discogs-tag: STYLE
      tagName = getTagName("STYLE");
      t.deepEqual(native[tagName], ['Blues Rock'], tagType + "/" + tagName);

      switch (tagType) {

        case "id3v23":
          t.deepEqual(common.genre, ["Rock;Blues", "Blues Rock"], tagType + "/" + tagName + " => common.genre");
          t.deepEqual(native.TCON, ["Rock;Blues"], tagType + "/TCON"); // ToDo: why different in Vorbis
          break;

        case "vorbis":
          t.deepEqual(common.genre, ["Rock", "Blues", "Blues Rock"], tagType + "/" + tagName + " => common.genre");
          t.deepEqual(native.GENRE, ["Rock", "Blues"], tagType + "/GENRE");
          t.deepEqual(native.STYLE, ["Blues Rock"], tagType + "/STYLE");
          break;
      }
    }

    it("ID3v2.3/ID3v2.4", () => {

      const filename = "Discogs - Beth Hart - Sinner's Prayer [id3v2.3].mp3";
      const filePath = path.join(__dirname, "samples", filename);

      function checkCommonTags(common) {
        // Compare expectedCommonTags with result.common
        t.deepEqual(common.album, "Don't Explain", "common.album");
        t.deepEqual(common.artist, "Beth Hart , Joe Bonamassa", "common.artist");
        // Discogs specific:
        t.deepEqual(common.discogs_release_id, "4204665", "common.discogs_release_id");
        t.deepEqual(common.catalognumber, "PRAR931391", "common.catalognumber");
      }

      function checkNative(id3v23) {
        // Compare expectedCommonTags with result.common
        t.deepEqual(id3v23["TXXX:CATALOGID"], "PRAR931391");
      }

      // Run with default options
      return mm.parseFile(filePath, {native: true}).then(metadata => {

        t.ok(metadata.common, "should include common tags");
        t.deepEqual(metadata.format.tagTypes, ["ID3v2.3", "ID3v1"]);

        const common = metadata.common;
        const id3v23 = mm.orderTags(metadata.native["ID3v2.3"]);

        const format = metadata.format;
        // t.deepEqual(format.numberOfSamples, 93624, "format.numberOfSamples");
        t.deepEqual(format.sampleRate, 44100, "format.sampleRate");
        t.deepEqual(format.duration, 2.1681632653061222, "format.duration");
        t.approximately(format.bitrate, 144000, 1000, "format.bitrate");
        t.deepEqual(format.numberOfChannels, 2, "format.numberOfChannels");

        // Expect basic common tags
        t.deepEqual(common.album, "Don't Explain", "common.album");
        t.deepEqual(common.artist, "Beth Hart, Joe Bonamassa", "common.artist");

        // Check discogs, DISCOGS_RELEASE_ID
        t.deepEqual(id3v23["TXXX:DISCOGS_RELEASE_ID"], ["4204665"], "id3v23/TXXX:DISCOGS_RELEASE_ID");
        t.strictEqual(common.discogs_release_id, 4204665, "id3v23/TXXX:DISCOGS_RELEASE_ID: => common.discogs_release_id");

        // Check discogs, CATALOGID mapping
        t.deepEqual(id3v23["TXXX:CATALOGID"], ["PRAR931391"], "id3v23/TXXX:CATALOGID: PRAR931391");
        t.deepEqual(common.catalognumber, ["PRAR931391"], "id3v23/TXXX:CATALOGID => common.catalognumber");

        // Check discogs, CATALOGID mapping
        t.deepEqual(id3v23.TCON, ["Rock;Blues"], "id3v23/TCON");
        t.deepEqual(id3v23["TXXX:STYLE"], ["Blues Rock"], "id3v23/TXXX:STYLE");
        t.deepEqual(common.genre, ["Rock;Blues", "Blues Rock"], "id3v23/TXXX:STYLE => common.genre");
      });

    });

    it("Vorbis/FLAC", () => {

      const filename = "Discogs - Beth Hart - Sinner's Prayer [APEv2].flac";
      const filePath = path.join(__dirname, "samples", filename);

      function checkNative(id3v23) {
        // Compare expectedCommonTags with result.common
        t.deepEqual(id3v23["TXXX:CATALOGID"], "PRAR931391");
      }

      // Run with default options
      return mm.parseFile(filePath, {native: true}).then(metadata => {

        t.ok(metadata.common, "should include common tags");
        t.deepEqual(metadata.format.tagTypes, ["vorbis"]);

        const format = metadata.format;
        t.deepEqual(format.duration, 2.1229931972789116, "format.duration");
        t.deepEqual(format.sampleRate, 44100, "format.sampleRate");
        t.deepEqual(format.bitsPerSample, 16, "format.bitsPerSample");
        t.deepEqual(format.numberOfChannels, 2, "format.numberOfChannels");

        checkTags(metadata, "vorbis", tag => tag);
      });

    });

  });

  describe("Track mapping: Yasmin Levy - Mi Korasón.flac'", () => {

    function checkTags(metadata: IAudioMetadata, tagType, getTagName: (tag: string) => string) {

      const native = mm.orderTags(metadata.native[tagType]);
      const common = metadata.common;

      // Search for Discogs tags (DISCOGS_*)
      const discogs_tags_found: string[] = [];
      for (const tag in native) {
        if (tag.lastIndexOf("DISCOGS_", 0) >= 0) {
          discogs_tags.push(tag);
        }
      }

      // Make sure we parse the correct song
      t.deepEqual(common.album, "Sentir", "common.album");
      t.deepEqual(common.artist, "Yasmin Levy", "common.artist");

      // Each Discogs tag should be mapped
      for (const tag of discogs_tags_found) {
        assert.isTrue(discogs_tags.indexOf(tag) !== -1, "Discog/Vorbis tag: " + tag);
      }

      let tagName;

      // Check Discogs-tag: DISCOGS_RELEASE_ID
      tagName = getTagName("DISCOGS_RELEASE_ID");
      t.deepEqual(native[tagName], ["3520814"], tagType + "/" + tagName);
      t.deepEqual(common.discogs_release_id, 3520814, tagType + "/" + tagName + " => common.discogs_release_id");

      // Check Discogs-tag: DISCOGS_MASTER_RELEASE_ID
      tagName = getTagName("DISCOGS_MASTER_RELEASE_ID");
      t.deepEqual(native[tagName], ["461710"], tagType + "/" + tagName);
      t.deepEqual(common.discogs_master_release_id, 461710, tagType + "/" + tagName + " => common.discogs_master_release_id");

      // Check Discogs-tag: DISCOGS_ARTIST_ID
      tagName = getTagName("DISCOGS_ARTIST_ID");
      t.deepEqual(native[tagName], ["467650"], tagType + "/" + tagName);
      t.deepEqual(common.discogs_artist_id, [467650], tagType + "/" + tagName + " => common.discogs_artist_id");

      // tagName = getTagName("DISCOGS_ALBUM_ARTISTS");
      // t.deepEqual(native[tagName], ["Yasmin Levy"], tagType + "/" + tagName);
      // t.deepEqual(common.artists, ["Yasmin Levy", "Yasmin Levy"], tagType + "/" + tagName + " => common.artists"); // ToDo? remove duplicates
      // Check Discogs-tag: DISCOGS_ARTIST_NAME ToDo: test multiple artists
      tagName = getTagName("DISCOGS_ARTIST_NAME");
      t.deepEqual(native[tagName], ["Yasmin Levy"], tagType + "/" + tagName);
      t.deepEqual(common.artists, ["Yasmin Levy"], tagType + "/" + tagName + " => common.artists"); // ToDo? remove duplicates
      // Check Discogs-tag: DISCOGS_DATE
      tagName = getTagName("DISCOGS_DATE");
      t.deepEqual(native[tagName], ["2009"], tagType + "/" + tagName);
      // ToDo? t.deepEqual(common.originaldate, "2009", "Vorbis/DISCOGS_DATE: => common.originaldate");
      // Check Discogs: DISCOGS_CATALOG
      tagName = getTagName("DISCOGS_CATALOG");
      t.deepEqual(native[tagName], ["450010"], tagType + "/" + tagName);
      t.deepEqual(common.catalognumber, ["450010"], tagType + "/" + tagName + " => common.catalognumber");

    }

    it("Vorbis/FLAC tags", () => {

      const filename = "Discogs - Yasmin Levy - Mi Korasón.flac";

      return mm.parseFile(path.join(__dirname, "samples", filename), {native: true}).then(metadata => {

        t.ok(metadata.common, "should include common tags");
        t.deepEqual(metadata.format.tagTypes, ["vorbis"]);

        checkTags(metadata, "vorbis", tag => tag);

      });

    });

  });

});
