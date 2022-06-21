/* eslint-disable unicorn/consistent-function-scoping */
import { describe, assert, it } from "vitest";
import * as path from "node:path";

import { Parsers } from "./metadata-parsers";
import * as mm from "../lib";
import { samplePath } from "./util";
import { IdHeader } from "../lib/ogg/opus/OpusIdHeader";

const oggSamplePath = path.join(samplePath, "ogg");

describe("Parse Ogg", function () {
  // this.timeout(15000); // It takes a log time to parse, due to sync errors and assumption it is VBR (which is caused by the funny 224 kbps frame)

  function check_Nirvana_In_Bloom_commonTags(common: mm.ICommonTagsResult) {
    assert.strictEqual(common.title, "In Bloom", "common.title");
    assert.strictEqual(common.artist, "Nirvana", "common.artist");
    assert.strictEqual(common.albumartist, "Nirvana", "common.albumartist");
    assert.strictEqual(common.album, "Nevermind", "common.album");
    assert.strictEqual(common.year, 1991, "common.year");
    assert.deepEqual(common.track, { no: 2, of: 12 }, "common.track");
    assert.deepEqual(common.disk, { no: 1, of: 1 }, "common.disk");
    assert.deepEqual(common.genre, ["Grunge", "Alternative"], "genre");
    assert.strictEqual(
      common.picture[0].format,
      "image/jpeg",
      "picture format"
    );
    assert.strictEqual(common.picture[0].data.length, 30_966, "picture length");
    assert.strictEqual(
      common.barcode,
      "0720642442524",
      "common.barcode (including leading zero)"
    );
    assert.strictEqual(common.asin, "B000003TA4", "common.asin");
    assert.deepEqual(common.catalognumber, ["GED24425"], "common.asin");
    assert.deepEqual(common.isrc, ["USGF19942502"], "common.isrc");
  }

  function check_Nirvana_In_Bloom_VorbisTags(vorbis: mm.INativeTagDict) {
    assert.deepEqual(vorbis.TRACKNUMBER, ["2"], "vorbis.TRACKNUMBER");
    assert.deepEqual(vorbis.TRACKTOTAL, ["12"], "vorbis.TRACKTOTAL");
    assert.deepEqual(vorbis.ALBUM, ["Nevermind"], "vorbis.ALBUM");
    assert.deepEqual(
      vorbis.COMMENT,
      ["Nirvana's Greatest Album"],
      "vorbis.COMMENT"
    );
    assert.deepEqual(vorbis.GENRE, ["Grunge", "Alternative"], "vorbis.GENRE");
    assert.deepEqual(vorbis.TITLE, ["In Bloom"], "vorbis.TITLE");

    const cover = vorbis.METADATA_BLOCK_PICTURE[0];

    assert.strictEqual(
      cover.format,
      "image/jpeg",
      "vorbis.METADATA_BLOCK_PICTURE format"
    );
    assert.strictEqual(
      cover.type,
      "Cover (front)",
      "vorbis.METADATA_BLOCK_PICTURE tagTypes"
    );
    // test exact contents too
    assert.strictEqual(
      cover.data.length,
      30_966,
      "vorbis.METADATA_BLOCK_PICTURE length"
    );
    assert.strictEqual(
      cover.data[0],
      255,
      "vorbis.METADATA_BLOCK_PICTURE data 0"
    );
    assert.strictEqual(
      cover.data[1],
      216,
      "vorbis.METADATA_BLOCK_PICTURE data 1"
    );
    assert.strictEqual(
      cover.data[cover.data.length - 1],
      217,
      "vorbis.METADATA_BLOCK_PICTURE data -1"
    );
    assert.strictEqual(
      cover.data[cover.data.length - 2],
      255,
      "vorbis.METADATA_BLOCK_PICTURE data -2"
    );
  }

  describe("Parsing Ogg/Vorbis", () => {
    describe("decode: Nirvana - In Bloom - 2-sec.ogg", () => {
      const filePath = path.join(samplePath, "Nirvana - In Bloom - 2-sec.ogg");

      function checkFormat(format: mm.IFormat) {
        assert.deepEqual(format.tagTypes, ["vorbis"], "format.tagTypes");
        assert.strictEqual(format.duration, 2, "format.duration = 2.0 sec");
        assert.strictEqual(
          format.sampleRate,
          44_100,
          "format.sampleRate = 44.1 kHz"
        );
        assert.strictEqual(
          format.numberOfChannels,
          2,
          "format.numberOfChannels = 2 (stereo)"
        );
        assert.strictEqual(format.bitrate, 64_000, "bitrate = 64 kbit/sec");
      }

      for (const parser of Parsers) {
        it(parser.description, async () => {
          const metadata = await parser.initParser(filePath, "audio/ogg");
          checkFormat(metadata.format);
          check_Nirvana_In_Bloom_VorbisTags(
            mm.orderTags(metadata.native.vorbis)
          );
          check_Nirvana_In_Bloom_commonTags(metadata.common);
        });
      }
    });

    it("should handle page not finalized with the lastPage flag", async () => {
      const filePath = path.join(samplePath, "issue_62.ogg");

      const { format, common, quality } = await mm.parseFile(filePath);

      assert.deepEqual(format.tagTypes, ["vorbis"], "format.tagTypes");
      // assert.strictEqual(format.duration, 2.0, 'format.duration = 2.0 sec');
      assert.strictEqual(
        format.sampleRate,
        22_050,
        "format.sampleRate = 44.1 kHz"
      );
      assert.strictEqual(
        format.numberOfChannels,
        2,
        "format.numberOfChannels = 2 (stereo)"
      );
      assert.strictEqual(format.bitrate, 56_000, "bitrate = 64 kbit/sec");

      // Following is part a page which is not correctly finalized with lastPage flag
      assert.isDefined(common.title, "should provide: metadata.common.title");
      assert.equal(common.title, "Al-Fatihah", "metadata.common.title");
      assert.equal(
        common.artist,
        "Mishary Alafasi - www.TvQuran.com",
        "metadata.common.artist"
      );

      assert.includeDeepMembers(quality.warnings, [
        {
          message:
            "Invalid FourCC ID, maybe last OGG-page is not marked with last-page flag",
        },
      ]);
    });

    /**
     * Related issue: https://github.com/Borewit/music-metadata/issues/70
     */
    it("should not fail on an Ogg/Vorbis 'Setup header'", async () => {
      const filePath = path.join(samplePath, "issue_70.ogg");

      const { format, native } = await mm.parseFile(filePath);
      assert.strictEqual(format.container, "Ogg", "format.container");
      assert.strictEqual(format.codec, "Vorbis I", "format.codec");
      assert.strictEqual(format.sampleRate, 44_100, "format.sampleRate");

      const vorbis = mm.orderTags(native.vorbis);
      assert.deepEqual(vorbis.ALBUM, ["Dropsonde"]);
      assert.deepEqual(vorbis.ARTIST, ["Biosphere"]);
      assert.deepEqual(vorbis["ALBUM ARTIST"], ["Biosphere"]);
      assert.deepEqual(vorbis.ORGANIZATION, ["Touch UK"]);
      assert.deepEqual(vorbis.DATE, ["2006"]);
      assert.deepEqual(vorbis.RATING, ["-1"]);
      assert.deepEqual(vorbis.REPLAYGAIN_TRACK_PEAK, ["0.999969"]);
      assert.deepEqual(vorbis.REPLAYGAIN_TRACK_GAIN, ["0.440000 dB"]);
      assert.deepEqual(vorbis.REPLAYGAIN_ALBUM_GAIN, ["0.440000 dB"]);
    });
  });

  describe("Parsing Ogg/Opus", () => {
    describe("components", () => {
      it("IdHeader should throw error if data is shorter than header", () => {
        try {
          new IdHeader(18);
        } catch (error) {
          if (!(error instanceof Error)) throw error;
          assert.equal(
            error.message,
            "ID-header-page 0 should be at least 19 bytes long"
          );
        }
      });
    });

    describe("decode: Nirvana - In Bloom - 2-sec.opus", () => {
      const filePath = path.join(samplePath, "Nirvana - In Bloom - 2-sec.opus");

      function checkFormat(format: mm.IFormat) {
        assert.deepEqual(format.tagTypes, ["vorbis"], "format.tagTypes");
        assert.strictEqual(
          format.numberOfSamples,
          96_000,
          "format.numberOfSamples = 96000"
        );
        assert.approximately(
          format.duration,
          2,
          1 / 200,
          "format.duration = 2.0 sec"
        );
        assert.strictEqual(
          format.sampleRate,
          44_100,
          "format.sampleRate = 44.1 kHz"
        );
        assert.strictEqual(
          format.numberOfChannels,
          2,
          "format.numberOfChannels = 2 (stereo)"
        );
        // assert.strictEqual(format.bitrate, 64000, 'bitrate = 64 kbit/sec');
      }

      for (const parser of Parsers) {
        it(parser.description, async () => {
          const metadata = await parser.initParser(filePath, "audio/ogg");
          checkFormat(metadata.format);
          check_Nirvana_In_Bloom_VorbisTags(
            mm.orderTags(metadata.native.vorbis)
          );
          check_Nirvana_In_Bloom_commonTags(metadata.common);
        });
      }
    });
  });

  describe("Parsing Ogg/Speex", () => {
    describe("decode: 'female_scrub.spx'", () => {
      const filePath = path.join(samplePath, "female_scrub.spx");

      function checkFormat(format: mm.IFormat) {
        assert.strictEqual(format.container, "Ogg", "format.container");
        assert.strictEqual(format.codec, "Speex 1.0beta1");
        assert.strictEqual(
          format.sampleRate,
          8000,
          "format.sampleRate = 8 kHz"
        );
      }

      for (const parser of Parsers) {
        it(parser.description, async () => {
          const metadata = await parser.initParser(filePath, "audio/ogg");
          checkFormat(metadata.format);
        });
      }
    });

    it("check for ogg-multipage-metadata-bug", () => {
      const filePath = path.join(samplePath, "ogg-multipagemetadata-bug.ogg");

      return mm.parseFile(filePath).then((result) => {
        assert.strictEqual(
          result.common.title,
          "Modestep - To The Stars (Break the Noize & The Autobots Remix)",
          "title"
        );
        assert.strictEqual(
          result.common.artist,
          "Break The Noize & The Autobots",
          "artist"
        );
        assert.strictEqual(
          result.common.albumartist,
          "Modestep",
          "albumartist"
        );
        assert.strictEqual(result.common.album, "To The Stars", "album");
        assert.strictEqual(result.common.date, "2011-01-01", "year");
        assert.strictEqual(result.common.track.no, 2, "track no");
        assert.strictEqual(result.common.track.of, 5, "track of");
        assert.strictEqual(result.common.disk.no, 1, "disk no");
        assert.strictEqual(result.common.disk.of, 1, "disk of");
        assert.strictEqual(result.common.genre[0], "Dubstep", "genre");
        assert.strictEqual(
          result.common.picture[0].format,
          "image/jpeg",
          "picture format"
        );
        assert.strictEqual(
          result.common.picture[0].data.length,
          207_439,
          "picture length"
        );
      });
    });
  });

  describe("Calculate duration", () => {
    it("with proper last page header", async () => {
      const filePath = path.join(oggSamplePath, "last-page.oga");

      const { format } = await mm.parseFile(filePath);

      assert.strictEqual(format.container, "Ogg", "format.container");
      assert.strictEqual(format.codec, "Opus", "format.codec");
      assert.strictEqual(format.sampleRate, 48_000, "format.sampleRate");
      assert.strictEqual(
        format.numberOfSamples,
        253_440,
        "format.numberOfSamples"
      );
      assert.approximately(format.duration, 5.28, 1 / 200, "format.duration");
    });

    it("with no last page", async () => {
      const filePath = path.join(oggSamplePath, "no-last-page.oga");

      const { format, quality } = await mm.parseFile(filePath);

      assert.strictEqual(format.container, "Ogg", "format.container");
      assert.strictEqual(format.codec, "Opus", "format.codec");
      assert.strictEqual(format.sampleRate, 16_000, "format.sampleRate");
      assert.strictEqual(
        format.numberOfSamples,
        270_720,
        "format.numberOfSamples"
      );
      assert.approximately(format.duration, 5.64, 1 / 200, "format.duration");

      assert.includeDeepMembers(quality.warnings, [
        { message: "Last OGG-page is not marked with last-page flag" },
      ]);
    });
  });
});
