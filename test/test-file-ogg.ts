import { join } from "node:path";

import { describe, test, expect } from "vitest";

import { ICommonTagsResult, INativeTagDict, orderTags } from "../lib";
import { IdHeader } from "../lib/ogg/opus/OpusIdHeader";

import { Parsers } from "./metadata-parsers";
import { samplePath } from "./util";

const oggSamplePath = join(samplePath, "ogg");

// It takes a log time to parse, due to sync errors and assumption it is VBR (which is caused by the funny 224 kbps frame)

function check_Nirvana_In_Bloom_commonTags(common: ICommonTagsResult) {
  expect(common.title, "common.title").toBe("In Bloom");
  expect(common.artist, "common.artist").toBe("Nirvana");
  expect(common.albumartist, "common.albumartist").toBe("Nirvana");
  expect(common.album, "common.album").toBe("Nevermind");
  expect(common.year, "common.year").toBe(1991);
  expect(common.track, "common.track").toStrictEqual({ no: 2, of: 12 });
  expect(common.disk, "common.disk").toStrictEqual({ no: 1, of: 1 });
  expect(common.genre, "genre").toStrictEqual(["Grunge", "Alternative"]);
  expect(common.picture![0].format, "picture format").toBe("image/jpeg");
  expect(common.picture![0].data.length, "picture length").toBe(30_966);
  expect(common.barcode, "common.barcode (including leading zero)").toBe("0720642442524");
  expect(common.asin, "common.asin").toBe("B000003TA4");
  expect(common.catalognumber, "common.asin").toStrictEqual(["GED24425"]);
  expect(common.isrc, "common.isrc").toStrictEqual(["USGF19942502"]);
}

function check_Nirvana_In_Bloom_VorbisTags(vorbis: INativeTagDict) {
  expect(vorbis.TRACKNUMBER, "vorbis.TRACKNUMBER").toStrictEqual(["2"]);
  expect(vorbis.TRACKTOTAL, "vorbis.TRACKTOTAL").toStrictEqual(["12"]);
  expect(vorbis.ALBUM, "vorbis.ALBUM").toStrictEqual(["Nevermind"]);
  expect(vorbis.COMMENT, "vorbis.COMMENT").toStrictEqual(["Nirvana's Greatest Album"]);
  expect(vorbis.GENRE, "vorbis.GENRE").toStrictEqual(["Grunge", "Alternative"]);
  expect(vorbis.TITLE, "vorbis.TITLE").toStrictEqual(["In Bloom"]);

  const cover = vorbis.METADATA_BLOCK_PICTURE[0];

  expect(cover.format, "vorbis.METADATA_BLOCK_PICTURE format").toBe("image/jpeg");
  expect(cover.type, "vorbis.METADATA_BLOCK_PICTURE tagTypes").toBe("Cover (front)");
  // test exact contents too
  expect(cover.data.length, "vorbis.METADATA_BLOCK_PICTURE length").toBe(30_966);
  expect(cover.data[0], "vorbis.METADATA_BLOCK_PICTURE data 0").toBe(255);
  expect(cover.data[1], "vorbis.METADATA_BLOCK_PICTURE data 1").toBe(216);
  expect(cover.data[cover.data.length - 1], "vorbis.METADATA_BLOCK_PICTURE data -1").toBe(217);
  expect(cover.data[cover.data.length - 2], "vorbis.METADATA_BLOCK_PICTURE data -2").toBe(255);
}

describe.each(Parsers)("parser: %s", (_, parser) => {
  describe("Parsing Ogg/Vorbis", () => {
    test("decode: Nirvana - In Bloom - 2-sec.ogg", async () => {
      const filePath = join(samplePath, "Nirvana - In Bloom - 2-sec.ogg");
      const metadata = await parser(filePath, "audio/ogg");

      const format = metadata.format;

      expect(format.tagTypes, "format.tagTypes").toStrictEqual(["vorbis"]);
      expect(format.duration, "format.duration = 2.0 sec").toBe(2);
      expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(44_100);
      expect(format.numberOfChannels, "format.numberOfChannels = 2 (stereo)").toBe(2);
      expect(format.bitrate, "bitrate = 64 kbit/sec").toBe(64_000);

      check_Nirvana_In_Bloom_VorbisTags(orderTags(metadata.native.vorbis));
      check_Nirvana_In_Bloom_commonTags(metadata.common);
    });

    test("should handle page not finalized with the lastPage flag", async () => {
      const filePath = join(samplePath, "issue_62.ogg");

      const { format, common, quality } = await parser(filePath);

      expect(format.tagTypes, "format.tagTypes").toStrictEqual(["vorbis"]);
      // expect(format.duration, 'format.duration = 2.0 sec').toBe(2.0);
      expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(22_050);
      expect(format.numberOfChannels, "format.numberOfChannels = 2 (stereo)").toBe(2);
      expect(format.bitrate, "bitrate = 64 kbit/sec").toBe(56_000);

      // Following is part a page which is not correctly finalized with lastPage flag
      expect(common.title, "should provide: metadata.common.title").toBeDefined();
      expect(common.title, "metadata.common.title").toBe("Al-Fatihah");
      expect(common.artist, "metadata.common.artist").toBe("Mishary Alafasi - www.TvQuran.com");

      expect(quality.warnings).toContainEqual({
        message: "Invalid FourCC ID, maybe last OGG-page is not marked with last-page flag",
      });
    });

    /**
     * Related issue: https://github.com/Borewit/music-metadata/issues/70
     */
    test("should not fail on an Ogg/Vorbis 'Setup header'", async () => {
      const filePath = join(samplePath, "issue_70.ogg");

      const { format, native } = await parser(filePath);
      expect(format.container, "format.container").toBe("Ogg");
      expect(format.codec, "format.codec").toBe("Vorbis I");
      expect(format.sampleRate, "format.sampleRate").toBe(44_100);

      const vorbis = orderTags(native.vorbis);
      expect(vorbis.ALBUM).toStrictEqual(["Dropsonde"]);
      expect(vorbis.ARTIST).toStrictEqual(["Biosphere"]);
      expect(vorbis["ALBUM ARTIST"]).toStrictEqual(["Biosphere"]);
      expect(vorbis.ORGANIZATION).toStrictEqual(["Touch UK"]);
      expect(vorbis.DATE).toStrictEqual(["2006"]);
      expect(vorbis.RATING).toStrictEqual(["-1"]);
      expect(vorbis.REPLAYGAIN_TRACK_PEAK).toStrictEqual(["0.999969"]);
      expect(vorbis.REPLAYGAIN_TRACK_GAIN).toStrictEqual(["0.440000 dB"]);
      expect(vorbis.REPLAYGAIN_ALBUM_GAIN).toStrictEqual(["0.440000 dB"]);
    });
  });

  describe("Parsing Ogg/Opus", () => {
    describe("components", () => {
      test("IdHeader should throw error if data is shorter than header", () => {
        try {
          new IdHeader(18);
        } catch (error) {
          if (!(error instanceof Error)) throw error;
          expect(error.message).toBe("ID-header-page 0 should be at least 19 bytes long");
        }
      });
    });

    test("decode: Nirvana - In Bloom - 2-sec.opus", async () => {
      const filePath = join(samplePath, "Nirvana - In Bloom - 2-sec.opus");
      const metadata = await parser(filePath, "audio/ogg");

      const format = metadata.format;

      expect(format.tagTypes, "format.tagTypes").toStrictEqual(["vorbis"]);
      expect(format.numberOfSamples, "format.numberOfSamples = 96000").toBe(96_000);
      expect(format.duration, "format.duration = 2.0 sec").toBeCloseTo(2, 2);
      expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(44_100);
      expect(format.numberOfChannels, "format.numberOfChannels = 2 (stereo)").toBe(2);
      // expect(format.bitrate, 'bitrate = 64 kbit/sec').toBe(64000);

      check_Nirvana_In_Bloom_VorbisTags(orderTags(metadata.native.vorbis));
      check_Nirvana_In_Bloom_commonTags(metadata.common);
    });
  });

  describe("Parsing Ogg/Speex", () => {
    test("decode: 'female_scrub.spx'", async () => {
      const filePath = join(samplePath, "female_scrub.spx");
      const metadata = await parser(filePath, "audio/ogg");
      const format = metadata.format;

      expect(format.container, "format.container").toBe("Ogg");
      expect(format.codec).toBe("Speex 1.0beta1");
      expect(format.sampleRate, "format.sampleRate = 8 kHz").toBe(8000);
    });

    test("check for ogg-multipage-metadata-bug", async () => {
      const filePath = join(samplePath, "ogg-multipagemetadata-bug.ogg");

      const result = await parser(filePath);
      expect(result.common.title, "title").toBe("Modestep - To The Stars (Break the Noize & The Autobots Remix)");
      expect(result.common.artist, "artist").toBe("Break The Noize & The Autobots");
      expect(result.common.albumartist, "albumartist").toBe("Modestep");
      expect(result.common.album, "album").toBe("To The Stars");
      expect(result.common.date, "year").toBe("2011-01-01");
      expect(result.common.track.no, "track no").toBe(2);
      expect(result.common.track.of, "track of").toBe(5);
      expect(result.common.disk.no, "disk no").toBe(1);
      expect(result.common.disk.of, "disk of").toBe(1);
      expect(result.common.genre![0], "genre").toBe("Dubstep");
      expect(result.common.picture![0].format, "picture format").toBe("image/jpeg");
      expect(result.common.picture![0].data.length, "picture length").toBe(207_439);
    });
  });

  describe("Calculate duration", () => {
    test("with proper last page header", async () => {
      const filePath = join(oggSamplePath, "last-page.oga");

      const { format } = await parser(filePath);

      expect(format.container, "format.container").toBe("Ogg");
      expect(format.codec, "format.codec").toBe("Opus");
      expect(format.sampleRate, "format.sampleRate").toBe(48_000);
      expect(format.numberOfSamples, "format.numberOfSamples").toBe(253_440);
      expect(format.duration, "format.duration").toBeCloseTo(5.28, 2);
    });

    test("with no last page", async () => {
      const filePath = join(oggSamplePath, "no-last-page.oga");

      const { format, quality } = await parser(filePath);

      expect(format.container, "format.container").toBe("Ogg");
      expect(format.codec, "format.codec").toBe("Opus");
      expect(format.sampleRate, "format.sampleRate").toBe(16_000);
      expect(format.numberOfSamples, "format.numberOfSamples").toBe(270_720);
      expect(format.duration, "format.duration").toBeCloseTo(5.64, 2);

      expect(quality.warnings).toContainEqual({
        message: "Last OGG-page is not marked with last-page flag",
      });
    });
  });
});
