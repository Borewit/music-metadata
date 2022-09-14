import { join } from "node:path";

import { describe, test, expect } from "vitest";

import { orderTags } from "../lib";
import { ID3v24TagMapper } from "../lib/id3v2/ID3v24TagMapper";

import { Parsers } from "./metadata-parsers";
import { samplePath } from "./util";


describe.each(Parsers)("parser: %s", (description, parser) => {
  test("should parse MPEG-1 Audio Layer II ", async () => {
    /**
     * No errors found in file.
     *
     * ---------------------------
     * MPEG-length:        8359
     * Sample-rate:       44100
     * frame_size:         418
     * Samples per frame  1152
     *
     * Summary:
     * ===============
     * Total number of frames: 20, unpadded: 1, padded: 19
     * File is CBR. Bitrate of each frame is 128 kbps.
     * Exact length: 00:00
     *
     * FooBar: 22559 samples
     * Audacity: 23040 samples (assumed to be correct)
     *
     * Using CBR calculation: 23392.29375; same as Mutagen
     */
    const filePath = join(samplePath, "1971 - 003 - Sweet - Co-Co - CannaPower.mp2");

    const metadata = await parser(filePath, "audio/mpeg", { duration: true });

    expect(metadata.format.tagTypes, "Tags: ID3v1 & ID3v2.3").toStrictEqual(["ID3v2.3", "ID3v1"]);
    expect(metadata.format.container, "format.container = MPEG").toBe("MPEG");
    expect(metadata.format.codec, "format.codec = MPEG-1 Audio Layer II").toBe("MPEG 1 Layer 2");
    expect(metadata.format.bitrate, "format.bitrate = 128 kbit/sec").toBe(128_000);
    expect(metadata.format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(44_100);
    expect(metadata.format.numberOfSamples, "format.numberOfSamples = 23040").toBe(23_040);
    expect(metadata.format.duration, "duration [seconds]").toBe(0.522_448_979_591_836_8); // validated 2017-04-09
  });

  describe("MPEG frame sync efficiency", () => {
    const tmpFilePath = join(samplePath, "zeroes.mp3");

    test("should sync efficient from a stream", async function () {
      // It takes a log time to parse, due to sync errors and assumption
      // it is VBR (which is caused by the funny 224 kbps frame)
      // this.timeout(10000); // It takes a log time to parse, due to
      // sync errors and assumption it is VBR (which is caused by the
      // funny 224 kbps frame)

      await parser(tmpFilePath, "audio/mpeg", { duration: true });
    }, 10_000);
  });

  describe("mpeg parsing fails for irrelevant attributes #14", () => {
    test("should decode 04 - You Don't Know.mp3", async function () {
      /**
       * File has id3v2.3 & id3v1 tags
       * First frame is 224 kbps, rest 320 kbps
       * After id3v2.3, lots of 0 padding
       */
      // It takes a long time to parse, due to sync errors and assumption
      // it is VBR (which is caused by the funny 224 kbps frame)

      const filePath = join(samplePath, "04 - You Don't Know.mp3");

      const metadata = await parser(filePath, "audio/mpeg", { duration: true });

      const format = metadata.format;
      const common = metadata.common;
      const id3v23 = orderTags(metadata.native["ID3v2.3"]);
      const id3v1 = orderTags(metadata.native.ID3v1);

      expect(format.tagTypes, "format.tagTypes").toStrictEqual(["ID3v2.3", "ID3v1"]);
      expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(44_100);
      expect(format.numberOfSamples, "format.numberOfSamples").toBe(9_098_496); // FooBar says 3:26.329 seconds (9.099.119 samples)
      expect(format.duration, "format.duration").toBeCloseTo(206.3, 1); // FooBar says 3:26.329 seconds (9.099.119 samples)
      expect(format.bitrate, "format.bitrate = 128 kbit/sec").toBe(320_000);
      expect(format.numberOfChannels, "format.numberOfChannels 2 (stereo)").toBe(2);

      // t.strictEqual(format.codec, 'LAME3.91', 'format.codec');
      // t.strictEqual(format.codecProfile, 'CBR', 'format.codecProfile');

      expect(common.title, "common.title").toBe("You Don't Know");
      expect(common.artists, "common.artists").toStrictEqual(["Reel Big Fish"]);
      expect(common.albumartist, "common.albumartist").toBe("Reel Big Fish");
      expect(common.album, "common.album").toBe("Why Do They Rock So Hard?");
      expect(common.year, "common.year").toBe(1998);
      expect(common.track.no, "common.track.no").toBe(4);
      expect(common.track.of, "common.track.of").toBeNull();
      expect(common.disk.no, "common.disk.no").toBeNull();
      expect(common.disk.of, "common.disk.of").toBeNull();
      expect(common.genre, "common.genre").toStrictEqual(["Ska-Punk"]);
      expect(common.comment, "common.genre").toStrictEqual(["Jive"]);

      expect(id3v23.TPE2, "native: TPE2").toStrictEqual(["Reel Big Fish"]);
      expect(id3v23.TIT2, "native: TIT2").toStrictEqual(["You Don't Know"]);
      expect(id3v23.TALB, "native: TALB").toStrictEqual(["Why Do They Rock So Hard?"]);
      expect(id3v23.TPE1, "native: TPE1").toStrictEqual(["Reel Big Fish"]);
      expect(id3v23.TCON, "native: TCON").toStrictEqual(["Ska-Punk"]);
      expect(id3v23.TYER, "native: TYER").toStrictEqual(["1998"]);
      expect(id3v23.TCOM, "native: TCOM").toStrictEqual(["CA"]); // ToDo: common property?
      expect(id3v23.TRCK, "native: TRCK").toStrictEqual(["04"]);
      expect(id3v23.COMM, "native: COMM").toStrictEqual([{ description: "", language: "eng", text: "Jive" }]);

      expect(id3v1.artist, "id3v1.artist").toStrictEqual(["Reel Big Fish"]);
      expect(id3v1.title, "id3v1.title").toStrictEqual(["You Don't Know"]);
      expect(id3v1.album, "id3v1.album").toStrictEqual(["Why Do They Rock So Hard?"]);
      expect(id3v1.year, "(id3v1.year").toStrictEqual(["1998"]);
      expect(id3v1.track, "id3v1.track").toStrictEqual([4]);
      expect(id3v1.comment, "id3v1.comment").toStrictEqual(["000010DF 00000B5A 00007784"]);
    }, 15_000);

    test("should decode 07 - I'm Cool.mp3", async function () {
      // 'LAME3.91' found on position 81BCF=531407
      // It takes a long time to parse

      const filePath = join(samplePath, "07 - I'm Cool.mp3");

      const metadata = await parser(filePath, "audio/mpeg", { duration: true });

      const format = metadata.format;
      const common = metadata.common;
      const native = orderTags(metadata.native["ID3v2.3"]);

      expect(format.tagTypes, "format.type").toStrictEqual(["ID3v2.3", "ID3v1"]);
      expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(44_100);
      // t.strictEqual(format.numberOfSamples, 8040655, 'format.numberOfSamples'); // FooBar says 8.040.655 samples
      expect(format.duration, "format.duration").toBeCloseTo(200.9, 1); // FooBar says 3:26.329 seconds
      expect(format.bitrate, "format.bitrate = 128 kbit/sec").toBe(320_000);
      expect(format.numberOfChannels, "format.numberOfChannels 2 (stereo)").toBe(2);
      // t.strictEqual(format.codec, 'LAME3.98r', 'format.codec'); // 'LAME3.91' found on position 81BCF=531407// 'LAME3.91' found on position 81BCF=531407
      // t.strictEqual(format.codecProfile, 'CBR', 'format.codecProfile');

      expect(common.title, "common.title").toBe("I'm Cool");
      expect(common.artists, "common.artists").toStrictEqual(["Reel Big Fish"]);
      expect(common.albumartist, "common.albumartist").toBe("Reel Big Fish");
      expect(common.album, "common.album").toBe("Why Do They Rock So Hard?");
      expect(common.year, "common.year").toBe(1998);
      expect(common.track.no, "common.track.no").toBe(7);
      expect(common.track.of, "common.track.of").toStrictEqual(null);
      expect(common.disk.no, "common.disk.no").toStrictEqual(null);
      expect(common.disk.of, "common.disk.of").toStrictEqual(null);
      expect(common.genre, "common.genre").toStrictEqual(["Ska-Punk"]);
      expect(common.comment, "common.genre").toStrictEqual(["Jive"]);

      expect(native.TPE2, "native: TPE2").toStrictEqual(["Reel Big Fish"]);
      expect(native.TIT2, "native: TIT2").toStrictEqual(["I'm Cool"]);
      expect(native.TALB, "native: TALB").toStrictEqual(["Why Do They Rock So Hard?"]);
      expect(native.TPE1, "native: TPE1").toStrictEqual(["Reel Big Fish"]);
      expect(native.TCON, "native: TCON").toStrictEqual(["Ska-Punk"]);
      expect(native.TYER, "native: TYER").toStrictEqual(["1998"]);
      expect(native.TCOM, "native: TCOM").toStrictEqual(["CA"]);
      expect(native.TRCK, "native: TRCK").toStrictEqual(["07"]);
      expect(native.COMM, "native: COMM").toStrictEqual([{ description: "", language: "eng", text: "Jive" }]);
    }, 15_000);
  });

  /**
   * Related to issue #38
   */
  describe("Handle corrupt MPEG-frames", () => {
    test("should handle corrupt frame causing negative frame data left", async () => {
      /* ------------[outofbounds.mp3]-------------------------------------------
       Frame 2 header expected at byte 2465, but found at byte 3343.
       Frame 1 (bytes 2048-3343) was 1295 bytes long (expected 417 bytes).

       Frame 17 header expected at byte 19017, but found at byte 19019.
       Frame 16 (bytes 17972-19019) was 1047 bytes long (expected 1045 bytes).

       Frame 18 header expected at byte 20064, but found at byte 21107.
       Frame 17 (bytes 19019-21107) was 2088 bytes long (expected 1045 bytes).

       Summary:
       ===============
       Total number of frames: 19, unpadded: 3, padded: 16
       File is VBR. Average bitrate is 309 kbps.
       Exact length: 00:00
       ------------------------------------------------------------------------*/
      const filePath = join(samplePath, "outofbounds.mp3");
      const metadata = await parser(filePath, "audio/mpeg", { duration: true });
      const format = metadata.format;

      expect(format.tagTypes, "format.type").toStrictEqual(["ID3v2.3", "ID3v1"]);
      expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(44_100);
      expect(format.bitrate, "format.bitrate = 128 kbit/sec").toBe(320_000);
      expect(format.numberOfChannels, "format.numberOfChannels 2 (stereo)").toBe(2);
    });
  });

  const issueDir = join(samplePath);

  /**
   * Related to issue #39
   */
  describe("Multiple ID3 tags: ID3v2.3, ID3v2.4 & ID3v1", () => {
    test("should parse multiple tag headers: ID3v2.3, ID3v2.4 & ID3v1", async () => {
      if (description === "buffer") {
        await expect(parser(join(issueDir, "id3-multi-02.mp3"))).rejects.toBeDefined();
        return;
      }

      const metadata = await parser(join(issueDir, "id3-multi-02.mp3"));
      const format = metadata.format;

      expect(format.tagTypes, "format.tagTypes").toStrictEqual(["ID3v2.3", "ID3v2.4", "ID3v1"]);
      expect(format.duration, "format.duration").toBe(230.295_510_204_081_64);
      expect(format.container, "format.container").toBe("MPEG");
      expect(format.codec, "format.codec").toBe("MPEG 1 Layer 3");
      expect(format.lossless, "format.lossless").toBe(false);
      expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(44_100);
      expect(format.bitrate, "format.bitrate = 160 kbit/sec").toBe(320_000);
      expect(format.numberOfChannels, "format.numberOfChannels 2 (stereo)").toBe(2);
    });

    /**
     * Test on multiple headers: ID3v1, ID3v2.3, ID3v2.4 & ID3v2.4 ( 2x ID3v2.4 !! )
     */
    test("should decode mp3_01 with 2x ID3v2.4 header", async () => {
      // ToDo: currently second ID3v2.4 is overwritten. Either make both headers accessible or generate warning
      const metadata = await parser(join(issueDir, "id3-multi-01.mp3"));
      const format = metadata.format;

      expect(format.tagTypes, "format.tagTypes").toStrictEqual(["ID3v2.3", "ID3v2.4", "ID3v1"]);
      expect(format.duration, "format.duration").toBe(0.130_612_244_897_959_2);
      expect(format.container, "format.container").toBe("MPEG");
      expect(format.codec, "format.codec").toBe("MPEG 1 Layer 3");
      expect(format.lossless, "format.lossless").toBe(false);
      expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(44_100);
      expect(format.bitrate, "format.bitrate = 160 kbit/sec").toBe(320_000);
      expect(format.numberOfChannels, "format.numberOfChannels 2 (stereo)").toBe(2);
    });
  });

  /**
   * Test decoding popularimeter
   */
  describe("POPM decoding", () => {
    test("check mapping function", () => {
      expect(ID3v24TagMapper.toRating({ email: "user1@bla.com", rating: 0 }), "unknown rating").toStrictEqual({
        source: "user1@bla.com",
        rating: undefined,
      });
      expect(ID3v24TagMapper.toRating({ email: "user1@bla.com", rating: 1 }), "lowest rating").toStrictEqual({
        source: "user1@bla.com",
        rating: 0 / 255,
      });
      expect(ID3v24TagMapper.toRating({ email: "user1@bla.com", rating: 255 }), "highest rating").toStrictEqual({
        source: "user1@bla.com",
        rating: 1,
      });
    });

    test("from 'Yeahs-It's Blitz!.mp3'", async () => {
      const filePath = join(issueDir, "02-Yeahs-It's Blitz! 2.mp3");
      const metadata = await parser(filePath, "audio/mpeg", { duration: false });
      const idv23 = orderTags(metadata.native["ID3v2.3"]);
      expect(idv23.POPM[0], "ID3v2.3 POPM").toStrictEqual({
        email: "no@email",
        rating: 128,
        counter: 0,
      });
      expect(metadata.common.rating[0].rating, "Common rating").toBeCloseTo(0.5, 2);
    });

    test("from 'id3v2-lyrics.mp3'", async () => {
      const metadata = await parser(join(issueDir, "id3v2-lyrics.mp3"), "audio/mpeg", {
        duration: false,
      });
      const idv23 = orderTags(metadata.native["ID3v2.3"]);
      // Native rating value
      expect(idv23.POPM[0], "ID3v2.3 POPM").toStrictEqual({
        email: "MusicBee",
        rating: 255,
        counter: 0,
      });
      // Common rating value
      expect(metadata.common.rating[0].rating, "Common rating").toBe(1);
    });

    test("decode POPM without a counter field", async () => {
      const filePath = join(issueDir, "issue-100.mp3");

      const metadata = await parser(filePath, "audio/mpeg", { duration: true });
      const idv23 = orderTags(metadata.native["ID3v2.3"]);
      expect(idv23.POPM[0], "ID3v2.3 POPM").toStrictEqual({
        counter: undefined,
        email: "Windows Media Player 9 Series",
        rating: 255,
      });
    });
  });

  describe("Calculate / read duration", () => {
    test("VBR read from Xing header", async () => {
      const filePath = join(issueDir, "id3v2-xheader.mp3");
      const metadata = await parser(filePath, "audio/mpeg", {
        duration: false,
      });
      expect(metadata.format.duration).toBe(0.496_326_530_612_244_9);
    });

    test("VBR: based on frame count if duration flag is set", async () => {
      const filePath = join(issueDir, "Dethklok-mergeTagHeaders.mp3");
      // Wrap stream around buffer, to prevent the `stream.path` is provided

      const metadata = await parser(filePath, "audio/mpeg", { duration: true });
      expect(metadata.format.duration).toBeCloseTo(34.66, 1);
    });
  });

  test("It should be able to decode MPEG 2.5 Layer III", async () => {
    const filePath = join(issueDir, "mp3", "issue-347.mp3");
    const { format } = await parser(filePath);
    expect(format.container, "format.container").toBe("MPEG");
    expect(format.codec, "format.codec").toBe("MPEG 2.5 Layer 3");
    expect(format.codecProfile, "format.codec").toBe("CBR");
    expect(format.numberOfChannels, "format.numberOfChannels").toBe(1);
    expect(format.sampleRate, "format.sampleRate").toBe(8000);
    expect(format.tagTypes, "format.tagTypes").toStrictEqual([]);
  });
});
