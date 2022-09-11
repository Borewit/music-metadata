import { describe, test, expect } from "vitest";
import { orderTags } from "../lib";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { Parsers } from "./metadata-parsers";
import { samplePath } from "./util";

const flacFilePath = join(samplePath, "flac");

describe("decode flac.flac", () => {
  test.each(Parsers)("%s", async (_, parser) => {
    const metadata = await parser(join(samplePath, "flac.flac"), "audio/flac");

    const format = metadata.format;

    expect(format.container, "format.container").toBe("FLAC");
    expect(format.codec, "format.codec").toBe("FLAC");
    expect(format.tagTypes, "format.tagTypes").toStrictEqual(["vorbis"]);
    expect(format.duration, "format.duration").toBe(271.773_333_333_333_3);
    expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(44_100);
    expect(format.bitsPerSample, "format.bitsPerSample = 16 bit").toBe(16);
    expect(format.numberOfChannels, "format.numberOfChannels 2 (stereo)").toBe(2);

    const common = metadata.common;

    expect(common.title, "common.title").toBe("Brian Eno");
    expect(common.artists, "common.artists").toStrictEqual(["MGMT"]);
    expect(common.albumartist, "common.albumartist").toBeUndefined();
    expect(common.album, "common.album").toBe("Congratulations");
    expect(common.year, "common.year").toBe(2010);
    expect(common.track, "common.track").toStrictEqual({ no: 7, of: null });
    expect(common.disk, "common.disk").toStrictEqual({ no: null, of: null });
    expect(common.genre, "genre").toStrictEqual(["Alt. Rock"]);
    expect(common.picture[0].format, "common.picture format").toBe("image/jpeg");
    expect(common.picture[0].data.length, "common.picture length").toBe(175_668);

    const vorbis = orderTags(metadata.native.vorbis);

    // Compare expectedCommonTags with result.common
    expect(vorbis.TITLE, "vorbis.TITLE").toStrictEqual(["Brian Eno"]);
    expect(vorbis.ARTIST, "vorbis.ARTIST").toStrictEqual(["MGMT"]);
    expect(vorbis.DATE, "vorbis.DATE").toStrictEqual(["2010"]);
    expect(vorbis.TRACKNUMBER, "vorbis.TRACKNUMBER").toStrictEqual(["07"]);
    expect(vorbis.GENRE, "vorbis.GENRE").toStrictEqual(["Alt. Rock"]);
    expect(vorbis.COMMENT, "vorbis.COMMENT").toStrictEqual(["EAC-Secure Mode=should ignore equal sign"]);

    const picture = vorbis.METADATA_BLOCK_PICTURE[0];

    expect(picture.type, "raw METADATA_BLOCK_PICTUREtype").toBe("Cover (front)");
    expect(picture.format, "raw METADATA_BLOCK_PICTURE format").toBe("image/jpeg");
    expect(picture.description, "raw METADATA_BLOCK_PICTURE description").toBe("");
    expect(picture.width, "raw METADATA_BLOCK_PICTURE width").toBe(450);
    expect(picture.height, "raw METADATA_BLOCK_PICTURE height").toBe(450);
    expect(picture.colour_depth, "raw METADATA_BLOCK_PICTURE colour depth").toBe(24);
    expect(picture.indexed_color, "raw METADATA_BLOCK_PICTURE indexed_color").toBe(0);
    expect(picture.data.length, "raw METADATA_BLOCK_PICTURE length").toBe(175_668);
  });
});

describe("should be able to recognize a ID3v2 tag header prefixing a FLAC file", () => {
  const filePath = join(samplePath, "a kind of magic.flac");

  test.each(Parsers)("%s", async (_, parser) => {
    const metadata = await parser(filePath, "audio/flac");
    expect(metadata.format.tagTypes, 'File has 3 tag types: "vorbis", "ID3v2.3" & "ID3v1"').toStrictEqual([
      "ID3v2.3",
      "vorbis",
      "ID3v1",
    ]);
  });
});

describe("should be able to determine the bit-rate", () => {
  const filePath = join(samplePath, "04 Long Drive.flac");

  test.each(Parsers)("%s", async (_, parser) => {
    const metadata = await parser(filePath, "audio/flac");
    expect(metadata.format.bitrate).toBeCloseTo(496_000, -3);
  });
});

test("should handle a corrupt data", () => {
  const emptyStreamSize = 10 * 1024;
  const buf = Buffer.alloc(emptyStreamSize).fill(0);
  const tmpFilePath = join(samplePath, "zeroes.flac");

  writeFileSync(tmpFilePath, buf);

  test.each(Parsers)("%s", async (_, parser) => {
    await expect(parser(tmpFilePath, "audio/flac")).rejects.toHaveProperty(
      "message",
      "FourCC contains invalid characters"
    );
    unlinkSync(tmpFilePath);
  });
});

/**
 * Issue: https://github.com/Borewit/music-metadata/issues/266
 */
test.each(Parsers)("Support Vorbis METADATA_BLOCK_PICTURE tags", async (_, parser) => {
  const filePath = join(samplePath, "issue-266.flac");

  const metadata = await parser(filePath);
  const format = metadata.format;
  const common = metadata.common;
  const vorbis = orderTags(metadata.native.vorbis);

  expect(format.container).toBe("FLAC");
  expect(format.tagTypes).toStrictEqual(["vorbis"]);

  expect(vorbis.METADATA_BLOCK_PICTURE, "expect a Vorbis METADATA_BLOCK_PICTURE tag").toBeDefined();
  expect(vorbis.METADATA_BLOCK_PICTURE.length, "expect 2 Vorbis METADATA_BLOCK_PICTURE tags").toBe(2);

  expect(common.picture, "common.picture").toBeDefined();
  expect(common.picture, "common.picture.length").toHaveLength(2);
  expect(common.picture[0], "ommon.picture[0].format").toHaveProperty("format", "image/jpeg");
  expect(common.picture[0].data, "ommon.picture[0].data.length").toHaveLength(107_402);
  expect(common.picture[1], "ommon.picture[1].format").toHaveProperty("format", "image/jpeg");
  expect(common.picture[1].data, "ommon.picture[1].data.length").toHaveLength(215_889);
});

test.each(Parsers)("Handle FLAC with undefined duration (number of samples == 0)", async (_, parser) => {
  const filePath = join(flacFilePath, "test-unknown-duration.flac");
  const metadata = await parser(filePath);

  expect(metadata.format.duration, "format.duration").toBeUndefined();
});

test.each(Parsers)('Support additional Vorbis comment TAG mapping "ALMBUM ARTIST"', async (_, parser) => {
  const filePath = join(flacFilePath, "14. Samuel L. Jackson and John Travolta - Personality Goes a Long Way.flac");
  const metadata = await parser(filePath);
  const format = metadata.format;
  const common = metadata.common;

  expect(format.container, "format.container").toBe("FLAC");
  expect(format.codec, "format.codec").toBe("FLAC");

  expect(common.albumartist, "common.albumartist").toBe("Various Artists");
});
