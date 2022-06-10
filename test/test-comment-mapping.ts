import { describe, assert, it } from "vitest";
import * as path from "path";

import { samplePath } from "./util";
import * as mm from "../lib";

const t = assert;

/**
 * Ensure the mapping of native comment field to the common comment field is done correctly
 * Ref: https://github.com/Borewit/music-metadata/issues/50
 */
describe("Mapping of common comment tag", () => {
  describe("Vorbis", () => {
    it("FLAC/Vorbis", async () => {
      const filePath = path.join(
        samplePath,
        "MusicBrainz - Beth Hart - Sinner's Prayer.flac"
      );

      // Parse flac/Vorbis file
      const metadata = await mm.parseFile(filePath);
      t.deepEqual(metadata.common.comment, ["Test 123"]);
    });

    it("should map ogg/Vorbis", async () => {
      const filePath = path.join(
        samplePath,
        "MusicBrainz - Beth Hart - Sinner's Prayer.ogg"
      );

      // Parse ogg/Vorbis file
      const metadata = await mm.parseFile(filePath);
      t.deepEqual(metadata.common.comment, ["Test 123"]);
    });
  });

  describe("APEv2 header", async () => {
    it("Monkey's Audio / APEv2", async () => {
      const filePath = path.join(
        samplePath,
        "MusicBrainz - Beth Hart - Sinner's Prayer.ape"
      );

      // Run with default options
      const metadata = await mm.parseFile(filePath);
      t.deepEqual(metadata.common.comment, ["Test 123"]);
    });

    it("WavPack / APEv2", async () => {
      const filePath = path.join(
        samplePath,
        "wavpack",
        "MusicBrainz - Beth Hart - Sinner's Prayer.wv"
      );

      // Run with default options
      const metadata = await mm.parseFile(filePath);
      t.deepEqual(metadata.common.comment, ["Test 123"]);
    });
  });

  describe("ID3v2.3 header", async () => {
    it("MP3 / ID3v2.3", async () => {
      const filePath = path.join(
        samplePath,
        "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].V2.mp3"
      );

      // Run with default options
      const metadata = await mm.parseFile(filePath);
      t.deepEqual(metadata.common.comment, ["Test 123"]);
    });

    it("RIFF/WAVE/PCM / ID3v2.3", async () => {
      const filePath = path.join(
        samplePath,
        "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].wav"
      );

      const metadata = await mm.parseFile(filePath);
      t.deepEqual(metadata.common.comment, ["Test 123"]);
    });
  });

  describe("ID3v2.4 header", () => {
    it("MP3/ID3v2.4 header", async () => {
      const filename =
        "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].V2.mp3";
      const filePath = path.join(samplePath, filename);

      // Run with default options
      const metadata = await mm.parseFile(filePath);
      t.deepEqual(metadata.common.comment, ["Test 123"]);
    });

    it("should parse AIFF/ID3v2.4 audio file", async () => {
      const filePath = path.join(
        samplePath,
        "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].aiff"
      );

      // Run with default options
      const metadata = await mm.parseFile(filePath);
      t.deepEqual(metadata.common.comment, ["Test 123"]);
    });
  });

  it("should map M4A / (Apple) iTunes header", async () => {
    const filePath = path.join(
      samplePath,
      "MusicBrainz - Beth Hart - Sinner's Prayer.m4a"
    );

    // Run with default options
    const metadata = await mm.parseFile(filePath);
    // Aggregation of '----:com.apple.iTunes:NOTES' & '©cmt'
    t.deepEqual(metadata.common.comment, [
      "Medieval CUE Splitter (www.medieval.it)",
      "Test 123",
    ]);
  });

  it("should map WMA/ASF header", async () => {
    // ToDo: update sample file
    const filePath = path.join(
      samplePath,
      "MusicBrainz - Beth Hart - Sinner's Prayer.wma"
    );

    // Parse wma/asf file
    const metadata = await mm.parseFile(filePath);
    t.deepEqual(metadata.common.comment, ["Test 123"]);
  });
});
