import { describe, test, expect } from "vitest";
import { join } from "node:path";

import { parseFile, orderTags } from "../lib";
import { samplePath } from "./util";

const wavSamples = join(samplePath, "wav");

/**
 * Looks like RIFF/WAV not fully supported yet in MusicBrainz Picard: https://tickets.metabrainz.org/browse/PICARD-653?jql=text%20~%20%22RIFF%22.
 * This file has been fixed with Mp3Tag to have a valid ID3v2.3 tag
 */
test("should parse LIST-INFO (EXIF)", async () => {
  const filename = "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].wav";
  const filePath = join(samplePath, filename);

  // Parse wma/asf file
  const metadata = await parseFile(filePath);

  // Check wma format
  const format = metadata.format;

  expect(format.container, "format.container").toBe("WAVE");
  expect(format.codec, "format.codec").toBe("PCM");
  expect(format.lossless).toBe(true);
  expect(format.tagTypes, "format.tagTypes = ['exif', 'ID3v2.3']").toStrictEqual(["exif", "ID3v2.3"]);
  expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(44_100);
  expect(format.bitsPerSample, "format.bitsPerSample = 16 bits").toBe(16);
  expect(format.numberOfChannels, "format.numberOfChannels = 2 channels").toBe(2);
  expect(format.numberOfSamples, "format.numberOfSamples = 93624").toBe(93_624);
  expect(format.duration, "format.duration = ~2.123 seconds (checked with Adobe Audition)").toBe(
    2.122_993_197_278_911_6
  );

  // Check native tags
  const native = orderTags(metadata.native.exif);

  expect(native.IART, "exif.IART").toStrictEqual(["Beth Hart & Joe Bonamassa"]);
  expect(native.ICRD, "exif.ICRD").toStrictEqual(["2011"]);
  expect(native.INAM, "exif.INAM").toStrictEqual(["Sinner's Prayer"]);
  expect(native.IPRD, "exif.IPRD").toStrictEqual(["Don't Explain"]);
  expect(native.ITRK, "exif.ITRK").toStrictEqual(["1/10"]);
});

// Issue https://github.com/Borewit/music-metadata/issues/75
test("should be able to handle complex nested chunk structures", async () => {
  const filePath = join(samplePath, "issue_75.wav");

  const metadata = await parseFile(filePath);
  expect(metadata.format.container, "format.container").toBe("WAVE");
  expect(metadata.format.codec, "format.codec").toBe("PCM");
});

test("should map RIFF tags to common", async () => {
  // Metadata edited with Adobe Audition CC 2018.1
  const filePath = join(__dirname, "samples", "riff_adobe_audition.wav");

  const metadata = await parseFile(filePath);
  const format = metadata.format;
  expect(format.lossless).toBe(true);
  expect(format.container, "format.container").toBe("WAVE");
  expect(format.codec, "format.codec").toBe("PCM");
  expect(format.bitsPerSample).toBe(24);
  expect(format.sampleRate).toBe(48_000);
  expect(format.numberOfSamples).toBe(13_171);
  expect(format.duration, "~2.274 (checked with Adobe Audition)").toBe(0.274_395_833_333_333_34);
  expect(format.tagTypes).toStrictEqual(["exif"]);

  const native = orderTags(metadata.native.exif);
  expect(native.IART, "exif.IART: Original Artist").toStrictEqual(["Wolfgang Amadeus Mozart"]);
  expect(native.ICMS, "exif.ICMS: Commissioned").toStrictEqual(["Louis Walker"]);
  expect(native.ICMT, "exif.ICMT: Comments").toStrictEqual(["Comments here!"]);
  expect(native.ICOP).toStrictEqual(["Copyright 2018"]);
  expect(native.ICRD).toStrictEqual(["2018-04-26T13:26:19-05:00"]);
  expect(native.IENG, "exif.IENG: Engineer").toStrictEqual(["Engineer"]);
  expect(native.IARL, "exif.IARL: Archival Location").toStrictEqual(["https://github.com/borewit/music-metadata"]);
  expect(native.IGNR, "exif.IGNR: Genre").toStrictEqual(["Blues"]);
  expect(native.IKEY, "exif.IKEY: Keywords").toStrictEqual(["neat; cool; riff; tags"]);
  expect(native.IMED, "exif.IMED: Original Medium").toStrictEqual(["CD"]);
  expect(native.INAM, "exif.INAM: Display Title").toStrictEqual(["The Magic Flute"]);
  expect(native.IPRD, "exif.IPRD: Product").toStrictEqual(["La clemenzo di Tito"]);
  expect(native.ISBJ, "exif.ISBJ: Subject").toStrictEqual(["An opera in two acts"]);
  expect(native.ISFT).toStrictEqual(["Adobe Audition CC 2018.1 (Macintosh)"]);
  expect(native.ISRC, "exif.ISRC Source Supplier").toStrictEqual(["Foo Bar"]);
  expect(native.ITCH, "exif.ITCH: Technician").toStrictEqual(["Technician"]);

  const common = metadata.common;
  expect(common.artists).toStrictEqual(["Wolfgang Amadeus Mozart"]);
  expect(common.title).toBe("The Magic Flute");
  expect(common.album).toBe("La clemenzo di Tito");
  expect(common.date).toBe("2018-04-26T13:26:19-05:00");
  expect(common.year).toBe(2018);
  expect(common.encodedby).toBe("Adobe Audition CC 2018.1 (Macintosh)");
  expect(common.comment).toStrictEqual(["Comments here!"]);
  expect(common.genre).toStrictEqual(["Blues"]);
  expect(common.engineer).toStrictEqual(["Engineer"]);
  expect(common.technician).toStrictEqual(["Technician"]);
  expect(common.media).toBe("CD");
});

test("should handle be able to handle odd chunk & padding", async () => {
  const filePath = join(samplePath, "issue-161.wav");

  const metadata = await parseFile(filePath, { duration: true });
  const format = metadata.format;
  expect(format.container, "format.container").toBe("WAVE");
  expect(format.codec, "format.codec").toBe("PCM");
  expect(format.lossless).toBe(true);
  expect(format.sampleRate).toBe(48_000);
  expect(format.bitsPerSample).toBe(24);
  expect(format.numberOfSamples).toBe(363_448);
  expect(metadata.format.duration, "file's duration").toBe(format.numberOfSamples / format.sampleRate);
});

describe("non-PCM", () => {
  test("should parse Microsoft 4-bit ADPCM encoded", () => {
    const filePath = join(samplePath, "issue-92.wav");

    return parseFile(filePath, { duration: true }).then((metadata) => {
      const format = metadata.format;
      expect(format.container, "format.container").toBe("WAVE");
      expect(format.codec, "format.codec").toBe("ADPCM");
      expect(format.lossless).toBe(false);
      expect(format.sampleRate).toBe(22_050);
      expect(format.bitsPerSample).toBe(4);
      expect(format.numberOfSamples).toBe(4_660_260);
      expect(metadata.format.duration, "file's duration is 3'31\"").toBe(format.numberOfSamples / format.sampleRate);
    });
  });
});

// https://github.com/Borewit/music-metadata/issues/707
test("should handle missing chunk-size", async () => {
  const filePath = join(wavSamples, "ffmpeg-missing-chunksize.wav");

  const { format } = await parseFile(filePath);

  expect(format.container, "format.container").toBe("WAVE");
  expect(format.codec, "format.codec").toBe("PCM");
  expect(format.duration, "format.duration").toBe(27_648 / 44_100);
  expect(format.sampleRate, "format.sampleRate").toBe(44_100);
});

test("should handle odd list-type ID in LIST chunk", async () => {
  const filePath = join(wavSamples, "odd-list-type.wav");

  const { format } = await parseFile(filePath);

  expect(format.container, "format.container").toBe("WAVE");
  expect(format.codec, "format.codec").toBe("PCM");
  expect(format.sampleRate, "format.sampleRate").toBe(44_100);
  expect(format.duration, "format.duration").toBeCloseTo(3 / 44_100, 4);
});

// https://github.com/Borewit/music-metadata/issues/819
test("Duration despite wrong chunk size", async () => {
  const filePath = join(wavSamples, "issue-819.wav");

  const { format } = await parseFile(filePath);

  expect(format.container).toBe("WAVE");
  expect(format.codec).toBe("PCM");
  // expect(format.numberOfSamples, 'format.numberOfSamples').toBe(2158080);
  expect(format.duration, "format.duration").toBeCloseTo(2478 / 16_000, 2);
});
