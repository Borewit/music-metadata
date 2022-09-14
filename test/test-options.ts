import { join } from "node:path";

import { describe, test, expect } from "vitest";

import { orderTags } from "../lib";

import { Parsers } from "./metadata-parsers";
import { samplePath } from "./util";

describe.each(Parsers)("parser: %s", (_, parser) => {
  const skipCases: [string, { skipCovers?: boolean }, boolean][] = [
    ["should include cover-art if option.skipCovers is not defined", {}, true],
    ["NOT should include cover-art if option.skipCovers=true", { skipCovers: true }, false],
    ["should include cover-art if option.skipCovers=false", { skipCovers: false }, true],
  ];

  describe("'skipCovers' in APE format", () => {
    const file_ape = join(samplePath, "monkeysaudio.ape");
    test.each(skipCases)("%s", async (_description, options, expectedDefined) => {
      const metadata = await parser(file_ape, "audio/ape", options);
      const native = orderTags(metadata.native.APEv2);
      // Native
      expect(native["Cover Art (Back)"] !== undefined, "APEv2.'Cover Art (Back)'").toBe(expectedDefined);
      expect(native["Cover Art (Front)"] !== undefined, "APEv2.'Cover Art (Front)'").toBe(expectedDefined);
      // Common
      expect(metadata.common.picture !== undefined, "metadata.common.picture").toBe(expectedDefined);
    });
  });

  describe("'skipCovers' in FLAC/Vorbis format", () => {
    const file_flac = join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer.flac");
    test.each(skipCases)("%s", async (_description, options, expectedDefined) => {
      const metadata = await parser(file_flac, "audio/flac", options);
      const vorbis = orderTags(metadata.native.vorbis);
      // Native
      expect(vorbis.METADATA_BLOCK_PICTURE !== undefined, "vorbis.METADATA_BLOCK_PICTURE").toBe(expectedDefined);
      // Common
      expect(metadata.common.picture !== undefined, "metadata.common.picture").toBe(expectedDefined);
    });
  });

  describe("'skipCovers' in MP3/id3v2.2 format", () => {
    const file_id3v22 = join(samplePath, "id3v2.2.mp3");
    test.each(skipCases)("%s", async (_description, options, expectedDefined) => {
      const metadata = await parser(file_id3v22, "audio/mpeg", options);
      const id3 = orderTags(metadata.native["ID3v2.2"]);
      // Native
      expect(id3.PIC !== undefined, "id3v1.PIC").toBe(expectedDefined);
      // Common
      expect(metadata.common.picture !== undefined, "metadata.common.picture").toBe(expectedDefined);
    });
  });

  describe("'skipCovers' in M4A (id4) format", () => {
    const file_m4a = join(samplePath, "mp4", "id4.m4a");
    test.each(skipCases)("%s", async (_description, options, expectedDefined) => {
      const metadata = await parser(file_m4a, "audio/mp4", options);
      const iTunes = orderTags(metadata.native.iTunes);
      // Native
      expect(iTunes.covr !== undefined, "iTunes.covr").toBe(expectedDefined);
      // Common
      expect(metadata.common.picture !== undefined, "metadata.common.picture").toBe(expectedDefined);
    });
  });

  describe("'skipCovers' in ogg format", () => {
    const file_ogg = join(samplePath, "Nirvana - In Bloom - 2-sec.ogg");
    test.each(skipCases)("%s", async (_description, options, expectedDefined) => {
      const metadata = await parser(file_ogg, "audio/ogg", options);
      const vorbis = orderTags(metadata.native.vorbis);
      // Native
      expect(vorbis.METADATA_BLOCK_PICTURE !== undefined, "vorbis.METADATA_BLOCK_PICTURE").toBe(expectedDefined);
      // Common
      expect(metadata.common.picture !== undefined, "metadata.common.picture").toBe(expectedDefined);
    });
  });
});
