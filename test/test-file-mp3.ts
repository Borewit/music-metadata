import { describe, test, expect } from "vitest";
import { join } from "node:path";

import { parseFile, orderTags } from "../lib";
import { Parsers } from "./metadata-parsers";
import { samplePath } from "./util";

const mp3SamplePath = join(samplePath, "mp3");

describe("Test patterns for ISO/MPEG ", () => {
  test("ISO/MPEG 1 Layer 1", () => {
    // http://mpgedit.org/mpgedit/mpgedit/testdata/mpegdata.html#ISO_m1l1
    const samples = [
      { filename: "fl1.mp1", bitRate: 384, sampleRate: 32_000, channels: 2 },
      { filename: "fl2.mp1", bitRate: 384, sampleRate: 44_100, channels: 2 },
      { filename: "fl3.mp1", bitRate: 384, sampleRate: 48_000, channels: 2 },
      { filename: "fl4.mp1", bitRate: 32, sampleRate: 32_000, channels: 1 },
      { filename: "fl5.mp1", bitRate: 448, sampleRate: 48_000, channels: 2 },
      { filename: "fl6.mp1", bitRate: 384, sampleRate: 44_100, channels: 2 },
      { filename: "fl7.mp1", bitRate: 384, sampleRate: 44_100, channels: 2 },
      { filename: "fl8.mp1", bitRate: 384, sampleRate: 44_100, channels: 2 },
    ];

    test.each(samples)("samples", async (sample) => {
      const filePath = join(mp3SamplePath, "layer1", sample.filename);
      const { format } = await parseFile(filePath, { duration: true });

      expect(format.container, "format.container").toBe("MPEG");
      expect(format.codec, `'${sample.filename}' format.codec`).toBe(
        "MPEG 1 Layer 1"
      );
      expect(format.bitrate, `'${sample.filename}' format.bitrate`).toBe(
        sample.bitRate * 1000
      );
      expect(format.sampleRate, `'${sample.filename}' format.sampleRate`).toBe(
        sample.sampleRate
      );
      expect(
        format.numberOfChannels,
        `'${sample.filename}' format.channels`
      ).toBe(sample.channels);
    });
  });

  test("ISO/MPEG 1 Layer 2", () => {
    // http://mpgedit.org/mpgedit/mpgedit/testdata/mpegdata.html#ISO_m1l2
    const samples = [
      { filename: "fl10.mp2", bitRate: 192, sampleRate: 32_000, channels: 2 },
      { filename: "fl11.mp2", bitRate: 192, sampleRate: 44_100, channels: 2 },
      { filename: "fl12.mp2", bitRate: 192, sampleRate: 48_000, channels: 2 },
      { filename: "fl13.mp2", bitRate: 32, sampleRate: 32_000, channels: 1 },
      { filename: "fl14.mp2", bitRate: 384, sampleRate: 48_000, channels: 2 },
      { filename: "fl15.mp2", bitRate: 384, sampleRate: 48_000, channels: 2 },
      { filename: "fl16.mp2", bitRate: 256, sampleRate: 48_000, channels: 2 },
    ];

    test.each(samples)("samples", async (sample) => {
      const filePath = join(mp3SamplePath, "layer2", sample.filename);
      const { format } = await parseFile(filePath, { duration: true });

      expect(format.container, "format.container").toBe("MPEG");
      expect(format.codec, `'${sample.filename}' format.codec`).toBe(
        "MPEG 1 Layer 2"
      );
      expect(format.bitrate, `'${sample.filename}' format.bitrate`).toBe(
        sample.bitRate * 1000
      );
      expect(format.sampleRate, `'${sample.filename}' format.sampleRate`).toBe(
        sample.sampleRate
      );
      expect(
        format.numberOfChannels,
        `'${sample.filename}' format.channels`
      ).toBe(sample.channels);
    });
  });

  // http://mpgedit.org/mpgedit/mpgedit/testdata/mpegdata.html#ISO_m1l2
  test("ISO/MPEG 1 Layer 3", () => {
    const samples = [
      { filename: "compl.mp3", bitRate: 64, sampleRate: 48_000, channels: 1 },
      { filename: "he_32khz.mp3", sampleRate: 32_000, channels: 1 },
      { filename: "he_44khz.mp3", sampleRate: 44_100, channels: 1 },
      { filename: "he_48khz.mp3", sampleRate: 48_000, channels: 1 },
      { filename: "he_mode.mp3", sampleRate: 44_100, channels: 1 },
      {
        filename: "hecommon.mp3",
        bitRate: 128,
        sampleRate: 44_100,
        channels: 2,
      },
      { filename: "si.mp3", bitRate: 64, sampleRate: 44_100, channels: 1 },
      { filename: "si.mp3", bitRate: 64, sampleRate: 44_100, channels: 1 },
      {
        filename: "si_huff.mp3",
        bitRate: 64,
        sampleRate: 44_100,
        channels: 1,
      },
      {
        filename: "sin1k0db.mp3",
        bitRate: 128,
        sampleRate: 44_100,
        channels: 2,
      },
    ];

    test.each(samples)("samples", async (sample) => {
      const filePath = join(mp3SamplePath, "layer3", sample.filename);
      const { format } = await parseFile(filePath, { duration: true });

      expect(format.container, "format.container").toBe("MPEG");
      expect(format.codec, `'${sample.filename}' format.codec`).toBe(
        "MPEG 1 Layer 3"
      );
      if (sample.bitRate) {
        expect(format.bitrate, `'${sample.filename}' format.bitrate`).toBe(
          sample.bitRate * 1000
        );
      }
      expect(format.sampleRate, `'${sample.filename}' format.sampleRate`).toBe(
        sample.sampleRate
      );
      expect(
        format.numberOfChannels,
        `'${sample.filename}' format.channels`
      ).toBe(sample.channels);
    });
  });
});

test("should handle audio-frame-header-bug", async () => {
  const filePath = join(samplePath, "audio-frame-header-bug.mp3");

  const result = await parseFile(filePath, { duration: true });

  // FooBar: 3:20.556 (8.844.527 samples); 44100 Hz => 200.5561678004535 seconds
  // t.strictEqual(result.format.duration, 200.59591666666665); // previous
  // t.strictEqual(result.format.duration, 200.5561678004535); // FooBar
  // If MPEG Layer II is accepted, it will give back third frame with a different frame length;
  // therefore it start counting actual parsable frames ending up on ~66.86
  expect(result.format.duration).toBeCloseTo(200.5, 1);
}, 15_000);

test("should be able to parse: Sleep Away.mp3", async function () {
  const filePath = join(mp3SamplePath, "Sleep Away.mp3");
  const metadata = await parseFile(filePath, { duration: true });

  const { format, common } = metadata;
  expect(format.container, "format.container").toBe("MPEG");
  expect(format.codec, "format.codec").toBe("MPEG 1 Layer 3");
  expect(format.sampleRate, "format.sampleRate").toBe(44_100);
  expect(format.numberOfChannels, "format.numberOfChannels").toBe(2);
  expect(common.title).toBe("Sleep Away");
  expect(common.artist).toBe("Bob Acri");
  expect(common.composer).toStrictEqual(["Robert R. Acri"]);
  expect(common.genre).toStrictEqual(["Jazz"]);
  expect(common.picture.length, "should contain the cover").toBe(1);

  const picture = common.picture[0];
  expect(picture.description).toBe("thumbnail");
  expect(picture.format).toBe("image/jpeg");
  expect(picture.data.length).toBe(27_852);
}, 15_000);

// https://github.com/Borewit/music-metadata/issues/381
test("should be able to handle empty ID3v2 tag", async () => {
  const filePath = join(mp3SamplePath, "issue-381.mp3");
  const { format } = await parseFile(filePath);

  expect(format.container, "format.container").toBe("MPEG");
  expect(format.tagTypes, "format.tagTypes").toStrictEqual([
    "ID3v2.3",
    "ID3v1",
  ]);
});

// https://github.com/Borewit/music-metadata/issues/398
test("Handle empty picture tag", async () => {
  const filePath = join(mp3SamplePath, "empty-picture-tag.mp3");
  const { format, common, quality } = await parseFile(filePath);

  expect(format.container, "format.container").toBe("MPEG");
  expect(format.codec, "format.codec").toBe("MPEG 1 Layer 3");
  expect(common.title, "common.title").toBe("Frankie And Johnny");
  expect(common.artist, "common.artist").toBe("Sam Cooke");
  expect(common.album, "common.album,").toBe("Greatest Hits");
  expect(common.track, "common.track,").toStrictEqual({ no: 21, of: null });
  expect(common.year, "common.year,").toBe(1998);
  expect(common.picture, "common.picturh").toBeUndefined();
  expect(
    quality.warnings,
    "quality.warnings includes Empty picture tag found"
  ).toContainEqual({ message: "Empty picture tag found" });
});

// https://github.com/Borewit/music-metadata/issues/979
test("Handle odd number of octets for 16 bit unicide string", async () => {
  // TLEN as invalid encode 16 bit unicode string
  const filePath = join(mp3SamplePath, "issue-979.mp3");
  const { format, common, quality } = await parseFile(filePath, {
    duration: true,
  });

  expect(format.container, "format.container").toBe("MPEG");
  expect(format.codec, "format.codec").toBe("MPEG 1 Layer 3");

  expect(common.title, "common.title").toBe("Minnie & Me");
  expect(common.artist, "common.artist").toBe("Alexander Hacke");
  expect(common.album, "common.album").toBe("Sanctuary");
  expect(common.year, "common.year").toBe(2005);

  expect(quality.warnings, "Warning on invalid TLEN field").toContainEqual({
    message:
      "id3v2.3 type=TLEN header has invalid string value: Expected even number of octets for 16-bit unicode string",
  });
});

// https://github.com/Borewit/music-metadata/issues/430
test("Handle preceding ADTS frame with (invalid) frame length of 0 bytes", async () => {
  const filePath = join(mp3SamplePath, "adts-0-frame.mp3");
  const { format, common } = await parseFile(filePath, { duration: true });
  await parseFile(filePath);

  expect(format.container, "format.container").toBe("MPEG");
  expect(format.codec, "format.codec").toBe("MPEG 1 Layer 3");
  expect(format.codecProfile, "format.codecProfile").toBe("V2");
  expect(format.tool, "format.tool").toBe("LAME 3.97b");
  expect(format.tagTypes, "format.tagTypes").toStrictEqual([
    "ID3v2.3",
    "ID3v1",
  ]);

  expect(common.title, "common.title").toBe("Jan Pillemann Otze");
  expect(common.artist, "common.artist").toBe("Mickie Krause");
  expect(format.duration, "format.duration").toBeCloseTo(217.86, 2);
});

test("Able to handle corrupt LAME header", async () => {
  const filePath = join(mp3SamplePath, "issue-554.mp3");
  const { format, quality } = await parseFile(filePath, {
    duration: true,
  });

  expect(format.container, "format.container").toBe("MPEG");
  expect(format.codec, "format.codec").toBe("MPEG 2 Layer 3");
  expect(format.duration, "format.duration").toBeCloseTo(817.92, 2);
  expect(format.sampleRate, "format.sampleRate").toBe(22_050);

  expect(
    quality.warnings,
    "quality.warnings includes: 'Corrupt LAME header'"
  ).toContainEqual({ message: "Corrupt LAME header" });
});

describe("should handle incomplete MP3 file", () => {
  const filePath = join(samplePath, "incomplete.mp3");

  test("should decode from a file", async () => {
    const { format } = await parseFile(filePath);
    expect(format.tagTypes, "format.tagTypes").toStrictEqual([
      "ID3v2.3",
      "ID3v1",
    ]);
    expect(format.duration, "format.duration").toBeCloseTo(61.73, 2);
    expect(format.container, "format.container").toBe("MPEG");
    expect(format.codec, "format.codec").toBe("MPEG 2 Layer 3");
    expect(format.lossless, "format.lossless").toBe(false);
    expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(22_050);
    expect(format.bitrate, "format.bitrate = 128 kbit/sec").toBe(64_000);
    expect(format.numberOfChannels, "format.numberOfChannels 2 (stereo)").toBe(
      2
    );
  });
});

describe("Duration flag behaviour", () => {
  describe("MP3/CBR without Xing header", () => {
    const filePath = join(mp3SamplePath, "Sleep Away.mp3");

    describe("duration=false", () => {
      test.each(Parsers)("%j", async (parser) => {
        const metadata = await parser.initParser(filePath, "audio/mpeg", {
          duration: false,
        });
        expect(
          metadata.format.duration,
          "Don't expect a duration"
        ).toBeUndefined();
      });
    });

    describe("duration=true", function () {
      test.each(Parsers)("%j", async (parser) => {
        const metadata = await parser.initParser(filePath, "audio/mpeg", {
          duration: true,
        });
        expect(metadata.format.duration, "Expect a duration").toBeCloseTo(
          200.5,
          1
        );
      });
    });
  });
});

describe("MP3 with APEv2 footer header", () => {
  test("should be able to parse APEv2 header", async () => {
    const filePath = join(samplePath, "issue_56.mp3");

    const metadata = await parseFile(filePath);
    expect(metadata.format.container).toBe("MPEG");
    expect(metadata.format.tagTypes).toStrictEqual([
      "ID3v2.3",
      "APEv2",
      "ID3v1",
    ]);
  });

  test('should be able to parse APEv1 header"', async () => {
    const filePath = join(mp3SamplePath, "issue-362.apev1.mp3");
    const { format, common } = await parseFile(filePath, {
      duration: true,
    });

    expect(format.container, "format.container").toBe("MPEG");
    expect(format.tagTypes, "format.tagTypes").toStrictEqual([
      "ID3v2.3",
      "APEv2",
      "ID3v1",
    ]);

    expect(common.title, "common.artist").toBe("Do They Know It's Christmas?");
    expect(common.artist, "common.artist").toBe("Band Aid");
    expect(common.artists, "common.artists").toStrictEqual(["Band Aid"]);
    expect(common.album, "common.album").toBe("Now That's What I Call Xmas");
    expect(common.year, "common.year").toBe(2006);
    expect(common.comment, "common.comment").toStrictEqual([
      "TunNORM",
      " 0000080E 00000AA9 00002328 000034F4 0002BF65 0002BF4E 000060AC 0000668F 0002BF4E 00033467",
    ]);
    expect(common.genre, "common.genre").toStrictEqual(["General Holiday"]);
    expect(common.track.no, "common.track.no").toStrictEqual(2);
  });

  test("should be able to parse APEv2 header followed by a Lyrics3v2 header", async () => {
    const filePath = join(mp3SamplePath, "APEv2+Lyrics3v2.mp3");

    const { format, native } = await parseFile(filePath);
    expect(format.container).toBe("MPEG");
    expect(format.tagTypes).toStrictEqual(["ID3v2.3", "APEv2", "ID3v1"]);

    const ape = orderTags(native.APEv2);
    expect(ape.MP3GAIN_MINMAX).toStrictEqual(["131,189"]);
    expect(ape.REPLAYGAIN_TRACK_GAIN).toStrictEqual(["+0.540000 dB"]);
    expect(ape.REPLAYGAIN_TRACK_PEAK).toStrictEqual(["0.497886"]);
    expect(ape.MP3GAIN_UNDO).toStrictEqual(["+004,+004,N"]);
  });
});

describe("Handle Xing header", () => {
  test("Handle Xing header, without LAME extension", async () => {
    const filePath = join(mp3SamplePath, "Solace.mp3");
    const { format } = await parseFile(filePath, { duration: true });
    expect(format.container, "format.container").toBe("MPEG");
    expect(format.codec, "format.codec").toBe("MPEG 1 Layer 3");
    expect(format.tagTypes, "format.tagTypes").toStrictEqual([
      "ID3v2.3",
      "ID3v1",
    ]);
  });

  describe("Lame extension", () => {
    test("track peak", async () => {
      const filePath = join(mp3SamplePath, "lame-peak.mp3");
      const { format } = await parseFile(filePath, { duration: true });

      expect(format.container, "format.container").toBe("MPEG");
      expect(format.codec, "format.codec").toBe("MPEG 1 Layer 3");
      expect(format.codecProfile, "format.codecProfile").toBe("CBR");
      expect(format.tool, "format.tool").toBe("LAME 3.99r");
      expect(format.trackPeakLevel, "format.trackPeakLevel").toBeCloseTo(
        0.218_57,
        5
      );
      expect(format.trackGain, "format.trackGain").toBe(6.8);
      expect(format.albumGain, "format.albumGain").toBeUndefined();
    });
  });

  test("Handle invalid LAME version", async () => {
    const filePath = join(mp3SamplePath, "issue-828.mp3");

    const { format } = await parseFile(filePath);

    expect(format.container).toBe("MPEG");
    expect(format.codec).toBe("MPEG 1 Layer 3");
    expect(format.tool).toBe("LAME ZyK! ");
  });
});
