import { test, expect } from "vitest";
import { join } from "node:path";

import { samplePath } from "./util";
import { Parsers } from "./metadata-parsers";

// Add, change and fix some mappings #pr-544
// https://github.com/Borewit/music-metadata/pull/544

test.each(Parsers)("mp3-id3v24", async (parser) => {
  const filePath = join(samplePath, "mp3", "pr-544-id3v24.mp3");
  const metadata = await parser.initParser(filePath);

  const common = metadata.common;
  expect(common.movement, "metadata.common.movement").toBe("Movement Name");
  expect(common.movementIndex, "metadata.common.movementIndex").toStrictEqual({
    no: 1,
    of: 4,
  });
  expect(common.podcast, "metadata.common.podcast").toBe(true);
  expect(common.category, "metadata.common.category").toStrictEqual(["Podcast Category"]);
  expect(common.podcastId, "metadata.common.podcastId").toBe("1234");
  expect(common.keywords, "metadata.common.keywords").toStrictEqual(["Podcast Keywords"]);
  expect(common.podcasturl, "metadata.common.podcasturl").toBe("http://podcast.url");
  expect(common.subtitle, "metadata.common.subscription").toStrictEqual(["Short Description"]);
  expect(common.description, "metadata.common.description").toStrictEqual(["Long Description"]);
  expect(common.albumartistsort, "metadata.common.albumartistsort").toBe("Album Artist Sort");
  expect(common.albumsort, "metadata.common.albumsort").toBe("Album Sort");
  expect(common.artistsort, "metadata.common.artistsort").toBe("Artist Sort");
  expect(common.composersort, "metadata.common.composersort").toBe("Composer Sort");
  expect(common.titlesort, "metadata.common.titlesort").toBe("Title Sort");
  expect(common.copyright, "metadata.common.copyright").toBe("Copyright");
  expect(common.compilation, "metadata.common.compilation").toBe(true);
  expect(common.comment, "metadata.common.comment").toStrictEqual(["Tagged with Mp3tag v3.01"]);
  expect(common.date, "metadata.common.date").toBe("2020-06-29T00:00:00.000Z");
  expect(common.year, "metadata.common.year").toBe(2020);
  expect(common.originalalbum, "metadata.common.originalalbum").toBe("Original Album");
});

test.each(Parsers)("mp4", async (parser) => {
  const filePath = join(samplePath, "mp4", "pr-544.m4a");
  const metadata = await parser.initParser(filePath);

  const common = metadata.common;
  expect(common.movement, "metadata.common.movement").toBe("Movement Name");
  expect(common.movementIndex, "metadata.common.movementIndex").toStrictEqual({
    no: 1,
    of: 4,
  });
  expect(common.showMovement, "metadata.common.showMovement").toBe(true);
  expect(common.work, "metadata.common.work").toBe("Work");
  expect(common.podcast, "metadata.common.podcast").toBe(true);
  expect(common.category, "metadata.common.category").toStrictEqual(["Podcast Category"]);
  expect(common.podcastId, "metadata.common.podcastId").toBe("1234");
  expect(common.keywords, "metadata.common.keywords").toStrictEqual(["Podcast Keywords"]);
  expect(common.podcasturl, "metadata.common.podcasturl").toBe("http://podcast.url");
  expect(common.description, "metadata.common.subscription").toStrictEqual(["Short Description"]);
  expect(common.longDescription, "metadata.common.description").toBe("Long Description");
  expect(common.albumartistsort, "metadata.common.albumartistsort").toBe("Album Artist Sort");
  expect(common.albumsort, "metadata.common.albumsort").toBe("Album Sort");
  expect(common.artistsort, "metadata.common.artistsort").toBe("Artist Sort");
  expect(common.composersort, "metadata.common.composersort").toBe("Composer Sort");
  expect(common.titlesort, "metadata.common.titlesort").toBe("Title Sort");
  expect(common.copyright, "metadata.common.copyright").toBe("Copyright");
  expect(common.compilation, "metadata.common.compilation").toBe(true);
  expect(common.comment, "metadata.common.comment").toStrictEqual(["Tagged with Mp3tag v3.01"]);
  expect(common.date, "metadata.common.date").toBe("2020-06-29T00:00:00.000Z");
  expect(common.year, "metadata.common.year").toBe(2020);
  expect(common.hdVideo, "metadata.common.hdVideo").toBe(2);
  expect(common.stik, "metadata.common.stik").toBe(9);
});
