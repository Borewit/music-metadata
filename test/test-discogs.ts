import {} from "mocha";
import {assert} from "chai";
import * as mm from "../src";

import * as path from "path";

const t = assert;

describe("Discogs mappings", () => {

  it("should map ID3v2.3 tags", () => {

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
      t.deepEqual(format.duration, 2.1681632653061222, "format.duration");
      t.deepEqual(format.sampleRate, 44100, "format.sampleRate");
      t.deepEqual(format.bitrate, 128000, "format.bitrate");
      t.deepEqual(format.numberOfChannels, 2, "format.numberOfChannels");

      // Expect basic common tags
      t.deepEqual(common.album, "Don't Explain", "common.album");
      t.deepEqual(common.artist, "Beth Hart , Joe Bonamassa", "common.artist");

      // Check discogs, DISCOGS_RELEASE_ID
      t.deepEqual(id3v23["TXXX:DISCOGS_RELEASE_ID"], ["4204665"], "id3v23/TXXX:DISCOGS_RELEASE_ID");
      t.strictEqual(common.discogs_release_id, 4204665, "id3v23/TXXX:DISCOGS_RELEASE_ID: => common.discogs_release_id");

      // Check discogs, CATALOGID mapping
      t.deepEqual(id3v23["TXXX:CATALOGID"], ["PRAR931391"], "id3v23/TXXX:CATALOGID: PRAR931391");
      t.deepEqual(common.catalognumber, ["PRAR931391"], "id3v23/TXXX:CATALOGID => common.catalognumber");

      // Check discogs, CATALOGID mapping
      t.deepEqual(id3v23.TCON, ["Rock, Blues"], "id3v23/TCON");
      t.deepEqual(id3v23["TXXX:STYLE"], ["Blues Rock"], "id3v23/TXXX:STYLE");
      t.deepEqual(common.genre, ["Rock, Blues", "Blues Rock"], "id3v23/TXXX:STYLE => common.genre");
    });

  });

  it("should map APEv2/Vorbis tags", () => {

    const filename = "Discogs - Beth Hart - Sinner's Prayer [APEv2].flac";
    const filePath = path.join(__dirname, "samples", filename);

    function checkCommonTags(common) {
      // Compare expectedCommonTags with result.common
      t.deepEqual(common.album, "Don't Explain", "common.album");
      t.deepEqual(common.artist, "Beth Hart , Joe Bonamassa", "common.artist");
      // Discogs specific:
      t.deepEqual(common.discogs_release_id, "4204665", "common.discogs_release_id");
      t.deepEqual(common.catalognumber, ["PRAR931391"], "common.catalognumber");

    }

    function checkNative(id3v23) {
      // Compare expectedCommonTags with result.common
      t.deepEqual(id3v23["TXXX:CATALOGID"], "PRAR931391");
    }

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
      t.deepEqual(common.artist, "Beth Hart , Joe Bonamassa", "common.artist");

      // Check discogs, DISCOGS_RELEASE_ID
      t.deepEqual(vorbis.DISCOGS_RELEASE_ID, ["4204665"], "Vorbis/DISCOGS_RELEASE_ID");
      t.strictEqual(common.discogs_release_id, 4204665, "Vorbis/DISCOGS_RELEASE_ID: => common.discogs_release_id");

      // Check discogs, CATALOGID mapping
      t.deepEqual(vorbis.CATALOGID, ["PRAR931391"], "Vorbis/CATALOGID: PRAR931391");
      t.deepEqual(common.catalognumber, ["PRAR931391"], "Vorbis/CATALOGID => common.catalognumber");

      // Check discogs, CATALOGID mapping
      t.deepEqual(vorbis.GENRE, ["Rock, Blues"], "Vorbis/GENRE");
      t.deepEqual(vorbis.STYLE, ["Blues Rock"], "Vorbis/STYLE");
      t.deepEqual(common.genre, ["Blues Rock", "Rock, Blues"], "Vorbis/STYLE => common.genre");
    });

  });

});
