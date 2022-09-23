import { join } from "node:path";

import { describe, test, expect } from "vitest";

import { orderTags } from "../lib";

import { Parsers } from "./metadata-parsers";
import { samplePath } from "./util";

const fileBloodSugar = join(samplePath, "id3v1_Blood_Sugar.mp3");

describe("should be able to read an ID3v1 tag", () => {
  /**
   * 241920 samples
   */
  test.each(Parsers)("%j", async (_, parser) => {
    const metadata = await parser(fileBloodSugar, "audio/mpeg");
    const format = metadata.format;
    const common = metadata.common;

    expect(format.tagTypes, "format.tagTypes").toStrictEqual(["ID3v1"]);
    expect(format.container, "format.container").toBe("MPEG");
    expect(format.codec, "format.codec").toBe("MPEG 1 Layer 3");
    expect(format.lossless, "format.lossless").toBe(false);
    expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(44_100);
    expect(format.bitrate, "format.bitrate = 160 kbit/sec").toBe(160_000);
    expect(format.numberOfChannels, "format.numberOfChannels 2 (stereo)").toBe(2);
    expect(format.duration, "format.duration").toBe(241_920 / format.sampleRate);

    expect(common.title, "common.title").toBe("Blood Sugar");
    expect(common.artist, "common.artist").toBe("Pendulum");
    expect(common.album, "common.album").toBe("Blood Sugar (Single)");
    expect(common.albumartist, "common.albumartist").toBeUndefined();
    expect(common.year, "common.year").toBe(2007);
    expect(common.track.no, "common.track.no = 1 (ID3v1 tag)").toBe(1);
    expect(common.track.of, "common.track.of = null").toBeNull();
    expect(common.genre, "common.genre").toStrictEqual(["Electronic"]);
    expect(common.comment, "common.comment").toStrictEqual(["abcdefg"]);
  });
});

describe("it should skip id3v1 header if options.skipPostHeaders is set", () => {
  const filePath = join(samplePath, "07 - I'm Cool.mp3");

  test.each(Parsers)("%j", async (_, parser) => {
    const metadata = await parser(filePath, "audio/mpeg", {
      skipPostHeaders: true,
    });
    expect(metadata.format.tagTypes, "format.tagTypes").toStrictEqual(["ID3v2.3"]);
  });
});

describe("should handle MP3 without any tags", () => {
  const filePath = join(samplePath, "silence-2s-16000 [no-tags].CBR-128.mp3");

  test.each(Parsers)("%j", async (_, parser) => {
    const metadata = await parser(filePath, "audio/mpeg");
    const format = metadata.format;

    expect(format.tagTypes, "format.tagTypes").toStrictEqual([]);
    expect(format.duration, "format.duration").toBe(2.088);
    expect(format.container, "format.container").toBe("MPEG");
    expect(format.codec, "format.codec").toBe("MPEG 2 Layer 3");
    expect(format.lossless, "format.lossless").toBe(false);
    expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(16_000);
    expect(format.bitrate, "format.bitrate = 128 kbit/sec").toBe(128_000);
    expect(format.numberOfChannels, "format.numberOfChannels 2 (stereo)").toBe(2);
  });
});

describe("should decode ID3v1.0 with undefined tags", () => {
  /**
   * Kept 25 frames from original MP3; concatenated copied last 128 bytes to restore ID3v1.0 header
   */
  const filePath = join(samplePath, "Luomo - Tessio (Spektre Remix) ID3v10.mp3");

  test.each(Parsers)("%j", async (_, parser) => {
    const metadata = await parser(filePath, "audio/mpeg");

    const format = metadata.format;
    const common = metadata.common;

    expect(metadata, "should provide metadata").toBeDefined();

    expect(format.duration, "format.duration (checked with foobar)").toBe(33.384_489_795_918_37);
    expect(format.tagTypes, "format.tagTypes").toStrictEqual(["ID3v1"]);
    expect(format.container, "format.container").toBe("MPEG");
    expect(format.codec, "format.codec").toBe("MPEG 1 Layer 3");
    expect(format.lossless, "format.lossless").toBe(false);
    expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(44_100);
    // t.strictEqual(format.bitrate, 128000, 'format.bitrate = 128 bit/sec');
    expect(format.numberOfChannels, "format.numberOfChannels 2 (stereo)").toBe(2);

    expect(common.title, "common.title").toBe("Luomo - Tessio (Spektre Remix)");
    expect(common.artist, "common.artist").toBeUndefined();
    expect(common.album, "common.album").toBeUndefined();
    expect(common.albumartist, "common.albumartist").toBeUndefined();
    expect(common.year, "common.year").toBeUndefined();
    expect(common.track.no, "common.track.no = null").toBeNull();
    expect(common.track.of, "common.track.of = null").toBeNull();
    expect(common.genre, "common.genre").toBeUndefined();
    expect(common.comment, "common.comment").toBeUndefined();
  });
});

/**
 * Related issue: https://github.com/Borewit/music-metadata/issues/69
 */
describe("should respect null terminated tag values correctly", () => {
  const filePath = join(samplePath, "issue_69.mp3");

  test.each(Parsers)("%j", async (_, parser) => {
    const metadata = await parser(filePath, "audio/mpeg", {
      duration: true,
    });
    const id3v1 = orderTags(metadata.native.ID3v1);
    expect(id3v1.title, "id3v1.title").toStrictEqual(["Skupinove foto"]);
    expect(id3v1.artist, "id3v1.artist").toStrictEqual(["Pavel Dobes"]);
    expect(id3v1.album, "id3v1.album").toStrictEqual(["Skupinove foto"]);
    expect(id3v1.year, "id3v1.year").toStrictEqual(["1988"]);
  });
});
