import { describe, expect, test } from "vitest";
import { join } from "node:path";

import { commonTags, isSingleton } from "../lib/common/GenericTagInfo";
import { ratingToStars, selectCover } from "../lib";
import { CombinedTagMapper } from "../lib/common/CombinedTagMapper";
import { joinArtists } from "../lib/common/MetadataCollector";
import { parseHttpContentType } from "../lib/ParserFactory";

import { samplePath } from "./util";
import { Parsers } from "./metadata-parsers";

describe("GenericTagMap", () => {
  const combinedTagMapper = new CombinedTagMapper();

  test("Check if each native tag, is mapped to a valid common type", () => {
    expect(commonTags).toBeDefined();

    // for each tag type
    for (const [nativeType, tagMapper] of Object.entries(combinedTagMapper.tagMappers)) {
      for (const [nativeTag, commonType] of Object.entries(tagMapper.tagMap)) {
        expect(
          commonTags,
          `Unknown common tagTypes in mapping ${nativeType}.${nativeTag} => ${commonType}`
        ).toHaveProperty(commonType);
      }
    }
  });

  test("should be able to distinct singletons", () => {
    // common tags, singleton
    expect(isSingleton("title"), 'common tag "title" is a singleton').toBe(true);
    expect(isSingleton("artist"), 'common tag "artist" is a singleton').toBe(true);
    expect(isSingleton("artists"), 'common tag "artists" is not a singleton').toBe(false);
  });

  describe("common.artist / common.artists mapping", () => {
    test("should be able to join artists", () => {
      expect(joinArtists(["David Bowie"])).toBe("David Bowie");
      expect(joinArtists(["David Bowie", "Stevie Ray Vaughan"])).toBe("David Bowie & Stevie Ray Vaughan");
      expect(joinArtists(["David Bowie", "Queen", "Mick Ronson"])).toBe("David Bowie, Queen & Mick Ronson");
    });

    test.each(Parsers)("parse RIFF tags %s", async (parser) => {
      const filePath = join(samplePath, "issue-89 no-artist.aiff");

      const metadata = await parser.initParser(filePath, "audio/aiff", { duration: true });
      expect(metadata.common.artists, "common.artists directly via WM/ARTISTS").toStrictEqual([
        "Beth Hart",
        "Joe Bonamassa",
      ]);
      expect(metadata.common.artist, "common.artist derived from common.artists").toBe("Beth Hart & Joe Bonamassa");
    });
  });
});

describe("Convert rating", () => {
  test("should convert rating to stars", () => {
    expect(ratingToStars(undefined as number)).toBe(0);
    expect(ratingToStars(0)).toBe(1);
    expect(ratingToStars(0.1)).toBe(1);
    expect(ratingToStars(0.2)).toBe(2);
    expect(ratingToStars(0.5)).toBe(3);
    expect(ratingToStars(0.75)).toBe(4);
    expect(ratingToStars(1)).toBe(5);
  });
});

describe.each(Parsers)("function selectCover() %s", (parser) => {
  const multiCoverFiles = [
    "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].V2.mp3",
    "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].wav",
    "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].V2.mp3",
    "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].aiff",
    "MusicBrainz - Beth Hart - Sinner's Prayer.ape",
    "MusicBrainz - Beth Hart - Sinner's Prayer.flac",
    "MusicBrainz - Beth Hart - Sinner's Prayer.m4a",
    "MusicBrainz - Beth Hart - Sinner's Prayer.ogg",
    "id3v2.4.mp3",
    "issue-266.flac",
    "monkeysaudio.ape",
  ];

  test.each(multiCoverFiles)("Should pick the front cover %s", async (multiCoverFile) => {
    const filePath = join(samplePath, multiCoverFile);

    const metadata = await parser.initParser(filePath);

    expect(metadata.common.picture.length).toBeGreaterThanOrEqual(1);

    const cover = selectCover(metadata.common.picture);
    if (cover.type) {
      expect(cover.type, "cover.type").toBe("Cover (front)");
    } else {
      expect(cover.data, "First picture if no type is defined").toBe(metadata.common.picture[0].data);
    }
  });
});

describe("MimeType", () => {
  test("should be able to decode basic MIME-types", () => {
    const mime = parseHttpContentType("audio/mpeg");
    expect(mime.type).toBe("audio");
    expect(mime.subtype).toBe("mpeg");
  });

  test("should be able to decode MIME-type parameters", () => {
    const mime = parseHttpContentType("message/external-body; access-type=URL");
    expect(mime.type).toBe("message");
    expect(mime.subtype).toBe("external-body");
    expect(mime.parameters).toHaveProperty("access-type", "URL");
  });

  test("should be able to decode case MIME-type", () => {
    const mime = parseHttpContentType('Text/HTML;Charset="utf-8"');

    expect(mime.type).toBe("text");
    expect(mime.subtype).toBe("html");
    // eslint-disable-next-line unicorn/text-encoding-identifier-case
    expect(mime.parameters).toHaveProperty("charset", "utf-8");
  });

  test("should be able to decode MIME-type suffix", () => {
    const mime = parseHttpContentType("application/xhtml+xml");
    expect(mime.type).toBe("application");
    expect(mime.subtype).toBe("xhtml");
    expect(mime.suffix).toBe("xml");
  });
});
