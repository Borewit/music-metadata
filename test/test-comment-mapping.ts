import { describe, test, expect } from "vitest";
import { join } from "node:path";

import { samplePath } from "./util";
import { Parsers } from "./metadata-parsers";

/**
 * Ensure the mapping of native comment field to the common comment field is done correctly
 * Ref: https://github.com/Borewit/music-metadata/issues/50
 */
describe.each(Parsers)("Mapping of common comment tag", (parser) => {
  describe("Vorbis", () => {
    test("FLAC/Vorbis", async () => {
      expect.assertions(1);

      const filePath = join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer.flac");

      // Parse flac/Vorbis file
      const metadata = await parser.initParser(filePath);
      expect(metadata.common.comment).toStrictEqual(["Test 123"]);
    });

    test("should map ogg/Vorbis", async () => {
      expect.assertions(1);

      const filePath = join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer.ogg");

      // Parse ogg/Vorbis file
      const metadata = await parser.initParser(filePath);
      expect(metadata.common.comment).toStrictEqual(["Test 123"]);
    });
  });

  describe("APEv2 header", () => {
    test("Monkey's Audio / APEv2", async () => {
      expect.assertions(1);

      const filePath = join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer.ape");

      // Run with default options
      const metadata = await parser.initParser(filePath);
      expect(metadata.common.comment).toStrictEqual(["Test 123"]);
    });

    test("WavPack / APEv2", async () => {
      expect.assertions(1);

      const filePath = join(samplePath, "wavpack", "MusicBrainz - Beth Hart - Sinner's Prayer.wv");

      // Run with default options
      const metadata = await parser.initParser(filePath);
      expect(metadata.common.comment).toStrictEqual(["Test 123"]);
    });
  });

  describe("ID3v2.3 header", () => {
    test("MP3 / ID3v2.3", async () => {
      expect.assertions(1);

      const filePath = join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].V2.mp3");

      // Run with default options
      const metadata = await parser.initParser(filePath);
      expect(metadata.common.comment).toStrictEqual(["Test 123"]);
    });

    test("RIFF/WAVE/PCM / ID3v2.3", async () => {
      expect.assertions(1);

      const filePath = join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].wav");

      const metadata = await parser.initParser(filePath);
      expect(metadata.common.comment).toStrictEqual(["Test 123"]);
    });
  });

  describe("ID3v2.4 header", () => {
    test("MP3/ID3v2.4 header", async () => {
      expect.assertions(1);

      const filename = "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].V2.mp3";
      const filePath = join(samplePath, filename);

      // Run with default options
      const metadata = await parser.initParser(filePath);
      expect(metadata.common.comment).toStrictEqual(["Test 123"]);
    });

    test("should parse AIFF/ID3v2.4 audio file", async () => {
      expect.assertions(1);

      const filePath = join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].aiff");

      // Run with default options
      const metadata = await parser.initParser(filePath);
      expect(metadata.common.comment).toStrictEqual(["Test 123"]);
    });
  });

  test("should map M4A / (Apple) iTunes header", async () => {
    expect.assertions(1);

    const filePath = join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer.m4a");

    // Run with default options
    const metadata = await parser.initParser(filePath);
    // Aggregation of '----:com.apple.iTunes:NOTES' & '©cmt'
    expect(metadata.common.comment).toStrictEqual(["Medieval CUE Splitter (www.medieval.it)", "Test 123"]);
  });

  test("should map WMA/ASF header", async () => {
    expect.assertions(1);

    // ToDo: update sample file
    const filePath = join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer.wma");

    // Parse wma/asf file
    const metadata = await parser.initParser(filePath);
    expect(metadata.common.comment).toStrictEqual(["Test 123"]);
  });
});
