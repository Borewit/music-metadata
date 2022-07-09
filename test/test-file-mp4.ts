import { describe, test, expect } from "vitest";
import { join } from "node:path";
import { createReadStream } from "node:fs";

import { orderTags, parseStream, parseFile } from "../lib";
import { Parsers } from "./metadata-parsers";
import { samplePath } from "./util";

const mp4Samples = join(samplePath, "mp4");

describe("Parse MPEG-4 files (.m4a)", () => {
  test.each(Parsers)("%j", async (parser) => {
    const filePath = join(mp4Samples, "id4.m4a");

    const metadata = await parser.initParser(filePath, "audio/mp4");

    const format = metadata.format;

    expect(format.lossless).toBe(false);
    expect(format.container, "container").toBe("M4A/isom/iso2");
    expect(format.codec, "codec").toBe("MPEG-4/AAC");
    expect(format.numberOfChannels, "format.numberOfChannels").toBe(2);
    expect(format.sampleRate, "format.sampleRate").toBe(44_100);
    expect(format.tagTypes, "format.tagTypes").toStrictEqual(["iTunes"]);
    expect(format.duration, "format.duration").toBeCloseTo(2.206, 2);
    expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(44_100);
    expect(format.bitsPerSample, "format.bitsPerSample").toBe(16);
    expect(format.bitrate, "Calculate bit-rate").toBeCloseTo(148_000, -3);

    const common = metadata.common;

    expect(common.title, "title").toBe("Voodoo People (Pendulum Remix)");
    expect(common.artist, "artist").toBe("The Prodigy");
    expect(common.albumartist, "albumartist").toBe("Pendulum");
    expect(common.album, "album").toBe("Voodoo People");
    expect(common.year, "year").toBe(2005);
    expect(common.track.no, "track no").toBe(1);
    expect(common.track.of, "track of").toBe(12);
    expect(common.disk.no, "disk no").toBe(1);
    expect(common.disk.of, "disk of").toBe(1);
    expect(common.genre[0], "genre").toBe("Electronic");
    expect(common.picture[0].format, "picture 0 format").toBe("image/jpeg");
    expect(common.picture[0].data.length, "picture 0 length").toBe(196_450);
    expect(common.picture[1].format, "picture 1 format").toBe("image/jpeg");
    expect(common.picture[1].data.length, "picture 1 length").toBe(196_450);

    const native = orderTags(metadata.native.iTunes);
    expect(native, "Native m4a tags should be present").toBeTruthy();

    expect(native.trkn, "m4a.trkn").toStrictEqual(["1/12"]);
    expect(native.disk, "m4a.disk").toStrictEqual(["1/1"]);
    expect(native.tmpo, "m4a.tmpo").toStrictEqual([0]);
    expect(native.gnre, "m4a.gnre").toStrictEqual(["Electronic"]);
    expect(native.stik, "m4a.stik").toStrictEqual([1]);
    expect(native["©alb"], "m4a.©alb").toStrictEqual(["Voodoo People"]);
    expect(native.aART, "m4a.aART").toStrictEqual(["Pendulum"]);
    expect(native["©ART"], "m4a.©ART").toStrictEqual(["The Prodigy"]);
    expect(native["©cmt"], "m4a.©cmt").toStrictEqual(["(Pendulum Remix)"]);
    expect(native["©wrt"], "m4a.©wrt").toStrictEqual(["Liam Howlett"]);
    expect(
      native["----:com.apple.iTunes:iTunNORM"],
      "m4a.----:com.apple.iTunes:iTunNORM"
    ).toStrictEqual([
      " 0000120A 00001299 00007365 0000712F 0002D88B 0002D88B 00007F2B 00007F2C 0003C770 0001F5C7",
    ]);
    expect(native["©nam"], "m4a.©nam").toStrictEqual([
      "Voodoo People (Pendulum Remix)",
    ]);
    expect(native["©too"], "m4a.©too").toStrictEqual(["Lavf52.36.0"]);
    expect(native["©day"], "m4a.@day").toStrictEqual(["2005"]);

    // Check album art
    expect(native.covr).toBeDefined();
    expect(native.covr[0].format, "m4a.covr.format").toBe("image/jpeg");
    expect(native.covr[0].data.length, "m4a.covr.data.length").toBe(196_450);
  });
});

/**
 * Ref: https://github.com/Borewit/music-metadata/issues/74
 */
describe("should decode 8-byte unsigned integer", () => {
  test.each(Parsers)("%j", async (parser) => {
    const filePath = join(mp4Samples, "issue-74.m4a");

    const metadata = await parser.initParser(filePath, "audio/mp4");
    const { format, common, native } = metadata;

    expect(format.container, "format.container").toBe("isom/iso2/mp41");
    expect(format.codec, "format.codec").toBe("MPEG-4/AAC");
    expect(format.numberOfChannels, "format.numberOfChannels").toBe(2);
    expect(format.sampleRate, "format.sampleRate").toBe(44_100);
    expect(format.bitsPerSample, "format.bitsPerSample").toBe(16);

    expect(native.iTunes, "Native m4a tags should be present").toBeDefined();
    expect(native.iTunes.length).toBeGreaterThanOrEqual(1);

    expect(common.album).toBe(
      "Live at Tom's Bullpen in Dover, DE (2016-04-30)"
    );
    expect(common.albumartist).toBe("They Say We're Sinking");
    expect(common.comment).toStrictEqual([
      "youtube rip\r\nSource: https://www.youtube.com/playlist?list=PLZ4QPxwBgg9TfsFVAArOBfuve_0e7zQaV",
    ]);
  });
});

/**
 * Ref: https://github.com/Borewit/music-metadata/issues/79
 */
describe("should be able to extract the composer and artist", () => {
  test.each(Parsers)("%j", async (parser) => {
    const filePath = join(mp4Samples, "issue-79.m4a");

    const metadata = await parser.initParser(filePath, "audio/mp4");
    const { common, format } = metadata;

    expect(format.container, "format.container").toBe("M4A/mp42/isom");
    expect(format.codec, "format.codec").toBe("MPEG-4/AAC");
    expect(format.numberOfChannels, "format.numberOfChannels").toBe(2);
    expect(format.sampleRate, "format.sampleRate").toBe(44_100);
    expect(format.bitsPerSample, "format.bitsPerSample").toBe(16);

    expect(common.title).toBe("Uprising");
    expect(common.composer).toStrictEqual(["Muse"]);
    expect(common.artists).toStrictEqual(["Muse"]);
    expect(common.genre).toStrictEqual(["Rock"]);
    expect(common.date).toBe("2009");
    expect(common.encodedby).toBe("iTunes 8.2.0.23, QuickTime 7.6.2");
    expect(common.disk).toStrictEqual({ no: 1, of: 1 });
    expect(common.track).toStrictEqual({ no: 1, of: null });
  });
});

describe("Parse MPEG-4 Audio Book files (.m4b)", () => {
  describe("audio book from issue issue #127", () => {
    test.each(Parsers)("%j", async (parser) => {
      const filePath = join(mp4Samples, "issue-127.m4b");

      const metadata = await parser.initParser(filePath, "audio/mp4");
      const { common, format, native } = metadata;

      expect(format.container, "format.container").toBe("M4A/3gp5/isom");
      expect(format.codec, "format.codec").toBe("MPEG-4/AAC");

      expect(common.title).toBe("GloriesIreland00-12_librivox");
      expect(common.artists).toStrictEqual(["Joseph Dunn"]);
      expect(common.genre).toStrictEqual(["Audiobook"]);
      expect(common.encodedby).toBe("Chapter and Verse V 1.5");
      expect(common.disk).toStrictEqual({ no: null, of: null });
      expect(common.track).toStrictEqual({ no: 1, of: null });
      expect(common.comment).toStrictEqual([
        "https://archive.org/details/glories_of_ireland_1801_librivox",
      ]);

      const iTunes = orderTags(native.iTunes);
      // Ref: http://www.zoyinc.com/?p=1004
      expect(iTunes.stik, "iTunes.stik = 2 = Audiobook").toStrictEqual([2]);
    });
  });

  describe("Parse chapters", () => {
    /**
     * Source audio-book: https://librivox.org/the-babys-songbook-by-walter-crane/
     */

    const filePath = join(mp4Samples, "BabysSongbook_librivox.m4b");

    test("from a stream", async () => {
      const stream = createReadStream(filePath);
      const metadata = await parseStream(
        stream,
        { mimeType: "audio/mp4" },
        { includeChapters: true }
      );
      stream.close();

      const { common, format, native } = metadata;

      expect(format.container, "format.container").toBe("M4A/3gp5/isom");
      expect(format.codec, "format.codec").toBe("MPEG-4/AAC");
      expect(format.duration, "format.duration").toBeCloseTo(991.213, 2);

      expect(common.title, "common.title").toBe("Babys Songbook");
      expect(common.artists, "common.artists").toStrictEqual(["Walter Crane"]);
      expect(common.genre).toStrictEqual(["Audiobook"]);
      expect(common.encodedby).toBe("Chapter and Verse V 1.5");
      expect(common.disk, "common.disk").toStrictEqual({
        no: null,
        of: null,
      });
      expect(common.track, "common.track").toStrictEqual({
        no: null,
        of: null,
      });
      expect(common.comment, "common.comment").toBeUndefined();

      const iTunes = orderTags(native.iTunes);
      // Ref: http://www.zoyinc.com/?p=1004
      expect(iTunes.stik, "iTunes.stik = 2 = Audiobook").toStrictEqual([2]);

      expect(format.chapters).toStrictEqual([
        {
          sampleOffset: 45_056,
          title: "01 - Baby's Opera: 01 - Girls and Boys",
        },
        {
          sampleOffset: 2_695_168,
          title: "02 - Baby's Opera: 02 - The Mulberry Bush",
        },
        {
          sampleOffset: 5_083_136,
          title: "03 - Baby's Opera: 03 - Oranges and Lemons",
        },
        {
          sampleOffset: 8_352_768,
          title: "04 - Baby's Opera: 04 - St. Paul's Steeple",
        },
        {
          sampleOffset: 10_544_128,
          title: "05 - Baby's Opera: 05 - My Lady's Garden",
        },
        {
          sampleOffset: 12_284_928,
          title: "06 - Baby's Opera: 12 - Dickory Dock",
        },
        {
          sampleOffset: 14_125_056,
          title: "07 - Baby's Opera: 22 - Baa!Baa!Black Sheep",
        },
        {
          sampleOffset: 16_410_624,
          title:
            "08 - Baby's Bouquet: 01 - Dedication and Polly put the Kettle On",
        },
        {
          sampleOffset: 19_068_928,
          title: "09 - Baby's Bouquet: 02 - Hot Cross Buns",
        },
        {
          sampleOffset: 21_685_248,
          title: "10 - Baby's Bouquet: 03 - The Little Woman and the Pedlar",
        },
        {
          sampleOffset: 30_461_952,
          title: "11 - Baby's Bouquet: 04 - The Little Disaster",
        },
        {
          sampleOffset: 37_761_024,
          title: "12 - Baby's Bouquet: 05 - The Old Woman of Norwich",
        },
        {
          sampleOffset: 39_628_800,
          title: "13 - Baby's Bouquet: 12 - Lucy Locket",
        },
        {
          sampleOffset: 41_500_672,
          title: "14 - Baby's Bouquet: 18 - The North Wind & the Robin",
        },
      ]);
    });
  });
});

describe("Parse MPEG-4 Video (.mp4)", () => {
  describe("Parse TV episode", () => {
    test.each(Parsers)("%j", async (parser) => {
      const filePath = join(mp4Samples, "Mr. Pickles S02E07 My Dear Boy.mp4");

      const metadata = await parser.initParser(filePath, "video/mp4");
      expect(metadata.common.title).toBe("My Dear Boy");
      expect(metadata.common.tvEpisode).toBe(7);
      expect(metadata.common.tvEpisodeId).toBe("017");
      expect(metadata.common.tvSeason).toBe(2);
      expect(metadata.common.tvShow).toBe("Mr. Pickles");

      expect(metadata.format.container, "format.container").toBe("mp42/isom");
      expect(metadata.format.codec, "format.codec").toBe(
        "MPEG-4/AAC+AC-3+CEA-608"
      );
      expect(metadata.common.artist).toBe("Mr. Pickles");
      expect(metadata.common.artists).toStrictEqual(["Mr. Pickles"]);
      expect(metadata.common.albumartist).toBe("Mr. Pickles");
      expect(metadata.common.copyright).toBe("© & TM - Cartoon Network - 2016");

      const iTunes = orderTags(metadata.native.iTunes);
      // Ref: http://www.zoyinc.com/?p=1004
      expect(iTunes.stik, "iTunes.stik = 10 = TV Show").toStrictEqual([10]);
    });
  });
});

describe("should support extended atom header", () => {
  test.each(Parsers)("%j", async (parser) => {
    const filePath = join(mp4Samples, "issue-133.m4a");

    const metadata = await parser.initParser(filePath, "video/mp4");
    expect(metadata.format.container, "format.container").toBe("M4A/mp42/isom");
    expect(metadata.format.codec, "format.codec").toBe("MPEG-4/AAC");
  });
});

describe("Handle dashed atom-ID's", () => {
  test.each(Parsers)("%j", async (parser) => {
    const filePath = join(mp4Samples, "issue-151.m4a");

    const metadata = await parser.initParser(filePath, "video/mp4");
    expect(metadata.format.container, "format.container").toBe("mp42/isom");
    expect(metadata.format.codec, "format.codec").toBe("MPEG-4/AAC+MP4S");

    expect(metadata.common.album).toBe("We Don`t Need to Whisper");
    expect(metadata.common.albumartist).toBe("Angels and Airwaves");
    expect(metadata.common.artist).toBe("Angels and Airwaves");
    expect(metadata.common.artists).toStrictEqual(["Angels and Airwaves"]);
    expect(metadata.common.bpm).toBe(89);
    expect(metadata.common.genre).toStrictEqual(["Rock"]);
    expect(metadata.common.title).toBe("Distraction");
  });
});

describe("Parse Trumpsta (Djuro Remix)", () => {
  test.each(Parsers)("%j", async (parser) => {
    const filePath = join(mp4Samples, "01. Trumpsta (Djuro Remix).m4a");

    const metadata = await parser.initParser(filePath, "audio/m4a");
    expect(metadata.format.container, "format.container").toBe("M4A/mp42/isom");
    expect(metadata.format.codec, "format.codec").toBe("MPEG-4/AAC");

    expect(metadata.common.album).toBe("Trumpsta (Remixes)");
    expect(metadata.common.albumartist).toBe("Contiez");
    expect(metadata.common.artist).toBe("Contiez");
    expect(metadata.common.artists).toStrictEqual(["Contiez"]);
    expect(metadata.common.title).toBe("Trumpsta (Djuro Remix)");
  });
});

/**
 * Related issue: https://github.com/Borewit/music-metadata/issues/318
 */
test("Be able to handle garbage behind mdat root atom", async () => {
  /**
   * Sample file with 1024 zeroes appended
   */
  const m4aFile = join(mp4Samples, "issue-318.m4a");

  const metadata = await parseFile(m4aFile);
  const { format, common, quality } = metadata;
  expect(format.container, "format.container").toBe("M4A/mp42/isom");
  expect(format.codec, "format.codec").toBe("MPEG-4/AAC");
  expect(format.numberOfChannels, "format.numberOfChannels").toBe(2);
  expect(format.sampleRate, "format.sampleRate").toBe(44_100);
  expect(format.bitsPerSample, "format.bitsPerSample").toBe(16);
  expect(format.tagTypes, "format.tagTypes").toStrictEqual(["iTunes"]);

  expect(common.artist, "common.artist").toBe("Tool");
  expect(common.title, "common.title").toBe("Fear Inoculum");

  expect(
    quality.warnings,
    "check for warning regarding box.id=0"
  ).toContainEqual({ message: "Error at offset=117501: box.id=0" });
});

// https://github.com/Borewit/music-metadata/issues/387
test("Handle box.id = 0000", async () => {
  const { format, common } = await parseFile(join(mp4Samples, "issue-387.m4a"));
  expect(format.container, "format.container").toBe("M4A/mp42/isom");
  expect(format.codec, "format.codec").toBe("MPEG-4/AAC");
  expect(format.duration, "format.duration").toBeCloseTo(
    224.002_902_494_331_07,
    2
  );
  expect(format.sampleRate, "format.sampleRate").toBeCloseTo(44_100, 2);

  expect(common.artist, "common.artist").toBe("Chris Brown");
  expect(common.title, "common.title").toBe("Look At Me Now");
  expect(common.album, "common.album").toBe(
    "Look At Me Now (feat. Lil Wayne & Busta Rhymes) - Single"
  );
});

test("Extract creation and modified time", async () => {
  const filePath = join(mp4Samples, "Apple  voice memo.m4a");

  const { format, native } = await parseFile(filePath);

  expect(format.container, "format.container").toBe("M4A/isom/mp42");
  expect(format.codec, "format.codec").toBe("MPEG-4/AAC");
  expect(format.duration, "format.duration").toBeCloseTo(1.024, 3);
  expect(format.sampleRate, "format.sampleRate").toBe(48_000);

  expect(format.creationTime.toISOString(), "format.modificationTime").toBe(
    "2021-01-02T17:42:46.000Z"
  );
  expect(format.modificationTime.toISOString(), "format.modificationTime").toBe(
    "2021-01-02T17:43:25.000Z"
  );

  const iTunes = orderTags(native.iTunes);
  expect(iTunes.date[0], "moov.udta.date").toBe("2021-01-02T17:42:05Z");
});

// https://github.com/Borewit/music-metadata/issues/744
test("Select the audio track from mp4", async () => {
  const filePath = join(mp4Samples, "issue-744.mp4");

  const { format } = await parseFile(filePath);

  expect(format.container, "format.container").toBe("isom/iso2/mp41");
  expect(format.codec, "format.codec").toBe("MPEG-4/AAC");
  expect(format.numberOfChannels, "format.numberOfChannels").toBe(2);
  expect(format.sampleRate, "format.sampleRate").toBe(44_100);
  expect(format.bitsPerSample, "format.bitsPerSample").toBe(16);
  expect(format.duration, "format.duration").toBeCloseTo(360.8, 1);
});

// https://github.com/Borewit/music-metadata/issues/749
test("Handle 0 length box", async () => {
  const filePath = join(mp4Samples, "issue-749.m4a");

  const { format, common } = await parseFile(filePath);

  expect(format.container, "format.container").toBe("M4A/mp42/isom");
  expect(format.codec, "format.codec").toBe("MPEG-4/AAC");
  expect(format.numberOfChannels, "format.numberOfChannels").toBe(2);
  expect(format.sampleRate, "format.sampleRate").toBe(48_000);
  expect(format.bitsPerSample, "format.bitsPerSample").toBe(16);
  expect(format.duration, "format.duration").toBeCloseTo(1563.16, 2);

  expect(common.title, "common.title").toBe("S2E32 : Audio");
});
