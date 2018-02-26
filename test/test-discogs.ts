import {} from "mocha";
import {assert} from "chai";
import * as mm from "../src";

import * as path from "path";
import {VorbisTagMapper} from "../src/vorbis/VorbisTagMapper";
import {ID3v24TagMapper} from "../src/id3v2/ID3v24TagMapper";

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

  describe("ID3v2.3/ID3v2.4 Discogs tag mapping", () => {

    it("should map ID3v2.4 tags", () => {

      const mapper = new ID3v24TagMapper();

      // Each Discogs tag should be mapped
      for (const tag of discogs_tags) {
        const tagName = 'TXXX:' + tag;
        assert.isDefined(mapper.tagMap[tagName], "Discogs/ID3v2.4 tag: " + tagName);
      }
    });

    it("parse: 'Discogs - Beth Hart - Sinner's Prayer [id3v2.3].mp3'", () => {

      const filename = "Discogs - Beth Hart - Sinner's Prayer [id3v2.3].mp3";
      const filePath = path.join(__dirname, "samples", filename);

      // Run with default options
      return mm.parseFile(filePath, {native: true}).then(metadata => {

        t.ok(metadata.common, "should include common tags");
        t.deepEqual(metadata.format.tagTypes, ["ID3v2.3", "ID3v1.1"]);

        const common = metadata.common;
        const id3v23 = mm.orderTags(metadata.native["ID3v2.3"]);

        const format = metadata.format;
        t.deepEqual(format.duration, 2.1681632653061222, "format.duration");
        t.deepEqual(format.sampleRate, 44100, "format.sampleRate");
        t.deepEqual(format.bitrate, 128000, "format.bitrate");
        t.deepEqual(format.numberOfChannels, 2, "format.numberOfChannels");

        // Expect basic common tags
        t.deepEqual(common.album, "Don't Explain", "common.album");
        t.deepEqual(common.artist, "Beth Hart, Joe Bonamassa", "common.artist");

        // Check discogs, DISCOGS_RELEASE_ID
        t.deepEqual(id3v23["TXXX:DISCOGS_RELEASE_ID"], ["4204665"], "id3v23/TXXX:DISCOGS_RELEASE_ID");
        t.strictEqual(common.discogs_release_id, 4204665, "id3v23/TXXX:DISCOGS_RELEASE_ID: => common.discogs_release_id");

        // Check Discogs-tag: DISCOGS_ARTIST_ID
        t.deepEqual(id3v23["TXXX:DISCOGS_ARTIST_ID"], ["389157", "900313"], "Vorbis/DISCOGS_ARTIST_ID");
        t.deepEqual(common.discogs_artist_id, [389157, 900313], "Vorbis/DISCOGS_ARTIST_ID: => common.discogs_artist_id");

        // Check Discogs-tag: DISCOGS_ALBUM_ARTISTS
        t.deepEqual(id3v23["TXXX:DISCOGS_ALBUM_ARTISTS"], ["Beth Hart", "Joe Bonamassa"], "Vorbis/ DISCOGS_ALBUM_ARTISTS");
        t.deepEqual(common.artists, ["Beth Hart", "Joe Bonamassa"], "Vorbis/DISCOGS_ALBUM_ARTISTS: => common.artists");

        // Check Discogs-tag: DISCOGS_VOTES
        t.deepEqual(id3v23["TXXX:DISCOGS_VOTES"], ["9"], "Vorbis/DISCOGS_VOTES");
        t.deepEqual(common.discogs_votes, 9, "Vorbis/DISCOGS_VOTES: => common.discogs_votes");

        t.deepEqual(id3v23.TCON, ["Rock;Blues"], "id3v23/TCON"); // ToDo: why different in Varbis
        t.deepEqual(id3v23["TXXX:STYLE"], ['Blues Rock'], "id3v23/TXXX:STYLE");
        t.deepEqual(common.genre, ["Rock;Blues", "Blues Rock"], "id3v23/TXXX:STYLE => common.genre");
      });

    });

  });

  describe("APEv2/Vorbis tags", () => {

    it("should map ID3v2.4 tags", () => {

      const mapper = new VorbisTagMapper();

      // Each Discogs tag should be mapped
      for (const tag of discogs_tags) {
        assert.isDefined(mapper.tagMap[tag], "Discog/Vorbis tag: " + tag);
      }
    });

    it("should decode 'Discogs - Beth Hart - Sinner's Prayer [APEv2].flac'", () => {

      const filename = "Discogs - Beth Hart - Sinner's Prayer [APEv2].flac";
      const filePath = path.join(__dirname, "samples", filename);

      // Run with default options
      return mm.parseFile(filePath, {native: true}).then(metadata => {

        t.ok(metadata.common, "should include common tags");
        t.deepEqual(metadata.format.tagTypes, ["vorbis"]);

        const common = metadata.common;
        const vorbis = mm.orderTags(metadata.native.vorbis);

        const format = metadata.format;
        t.deepEqual(format.duration, 2.1229931972789116, "format.duration");
        t.deepEqual(format.sampleRate, 44100, "format.sampleRate");
        t.deepEqual(format.bitsPerSample, 16, "format.bitsPerSample");
        t.deepEqual(format.numberOfChannels, 2, "format.numberOfChannels");

        // Expect basic common tags
        t.deepEqual(common.album, "Don't Explain", "common.album");
        t.deepEqual(common.artist, "Beth Hart, Joe Bonamassa", "common.artist");

        // Check Discogs-tag: DISCOGS_RELEASE_ID
        t.deepEqual(vorbis.DISCOGS_RELEASE_ID, ["4204665"], "Vorbis/DISCOGS_RELEASE_ID");
        t.strictEqual(common.discogs_release_id, 4204665, "Vorbis/DISCOGS_RELEASE_ID: => common.discogs_release_id");

        // Check Discogs-tag: DISCOGS_ARTIST_ID
        t.deepEqual(vorbis.DISCOGS_ARTIST_ID, ["389157", "900313"], "Vorbis/DISCOGS_ARTIST_ID");
        t.deepEqual(common.discogs_artist_id, [389157, 900313], "Vorbis/DISCOGS_ARTIST_ID: => common.discogs_artist_id");

        // Check Discogs-tag: DISCOGS_ALBUM_ARTISTS
        t.deepEqual(vorbis.DISCOGS_ALBUM_ARTISTS, ["Beth Hart", "Joe Bonamassa"], "Vorbis/ DISCOGS_ARTIST_ID");
        t.deepEqual(common.artists, ["Beth Hart", "Joe Bonamassa"], "Vorbis/DISCOGS_ALBUM_ARTISTS: => common.artists");

        // Check Discogs-tag: DISCOGS_VOTES
        t.deepEqual(vorbis.DISCOGS_VOTES, ["9"], "Vorbis/DISCOGS_VOTES");
        t.deepEqual(common.discogs_votes, 9, "Vorbis/DISCOGS_VOTES: => common.discogs_votes");

        t.deepEqual(vorbis.GENRE, ["Rock", "Blues"], "Vorbis/GENRE");
        t.deepEqual(vorbis.STYLE, ["Blues Rock"], "Vorbis/STYLE");
        t.deepEqual(common.genre, ["Rock", "Blues", "Blues Rock"], "Vorbis/STYLE => common.genre");
      });

    });

    it("should decode 'Discogs - Yasmin Levy - Mi Korasón.flac'", () => {

      const filename = "Discogs - Yasmin Levy - Mi Korasón.flac";

      return mm.parseFile(path.join(__dirname, "samples", filename), {native: true}).then(metadata => {

        t.ok(metadata.common, "should include common tags");
        t.deepEqual(metadata.format.tagTypes, ["vorbis"]);

        const common = metadata.common;
        const vorbis = mm.orderTags(metadata.native.vorbis);

        // Make sure we parse the correct song
        t.deepEqual(common.album, "Sentir", "common.album");
        t.deepEqual(common.artist, "Yasmin Levy", "common.artist");

        // Search for Discogs tags (DISCOGS_*)
        const discogs_tags_found: string[] = [];
        for (const tag in vorbis) {
          if (tag.lastIndexOf("DISCOGS_", 0) === 0) {
            discogs_tags.push(tag);
          }
        }

        // Each Discogs tag should be mapped
        for (const tag of discogs_tags_found) {
          assert.isTrue(discogs_tags.indexOf(tag) !== -1, "Discog/Vorbis tag: " + tag);
        }

        // Check Discogs-tag: DISCOGS_RELEASE_ID
        t.deepEqual(vorbis.DISCOGS_RELEASE_ID, ["3520814"], "Vorbis/DISCOGS_RELEASE_ID");
        t.deepEqual(common.discogs_release_id, 3520814, "Vorbis/DISCOGS_RELEASE_ID: => common.discogs_release_id");

        // Check Discogs-tag: DISCOGS_MASTER_RELEASE_ID
        t.deepEqual(vorbis.DISCOGS_MASTER_RELEASE_ID, ["461710"], "Vorbis/DISCOGS_MASTER_RELEASE_ID");
        t.deepEqual(common.discogs_master_release_id, 461710, "Vorbis/DISCOGS_MASTER_RELEASE_ID: => common.discogs_master_release_id");

        // Check Discogs-tag: DISCOGS_ARTIST_ID
        t.deepEqual(vorbis.DISCOGS_ARTIST_ID, ["467650"], "Vorbis/DISCOGS_ARTIST_ID");
        t.deepEqual(common.discogs_artist_id, [467650], "Vorbis/DISCOGS_ARTIST_ID: => common.discogs_artist_id");

        // Check Discogs-tag: DISCOGS_ARTIST_NAME ToDo: test multiple artists
        t.deepEqual(vorbis.DISCOGS_ARTIST_NAME, ["Yasmin Levy"], "Vorbis/DISCOGS_ARTIST_NAME");
        t.deepEqual(common.artists, ["Yasmin Levy", "Yasmin Levy"], "Vorbis/DISCOGS_ARTIST_NAME: => common.artists"); // ToDo? remove duplicates

        // Check Discogs-tag: DISCOGS_DATE
        t.deepEqual(vorbis.DISCOGS_DATE, ["2009"], "Vorbis/DISCOGS_DATE");
        // ToDo? t.deepEqual(common.originaldate, "2009", "Vorbis/DISCOGS_DATE: => common.originaldate");

        // Check Discogs: DISCOGS_CATALOG
        t.deepEqual(vorbis.DISCOGS_CATALOG, ["450010"], "Vorbis/DISCOGS_CATALOG: 450010");
        t.strictEqual(common.catalognumber, "450010", "Vorbis/CATALOGID => common.catalognumber");
      });

    });

  });

});
