import { join } from "node:path";

import { expect, test } from "vitest";

import { Parsers } from "./metadata-parsers";
import { samplePath } from "./util";

test.each(Parsers)("should be able to read metadata with unknown encoding", async (_, parser) => {
  const filePath = join(samplePath, "bug-unkown encoding.mp3");

  const metadata = await parser(filePath);
  const common = metadata.common;

  expect(common.title, "title").toBe("808");
  expect(common.artist, "artist").toBe("Benga");
  expect(common.albumartist, "albumartist").toBe("Benga");
  expect(common.album, "album").toBe("Phaze One");
  expect(common.year, "year").toBe(2010);
  expect(common.track.no, "track no").toBe(4);
  expect(common.track.of, "track of").toBe(8);
  expect(common.genre[0], "genre").toBe("Dubstep");
  expect(common.picture[0].format, "picture format").toBe("image/jpeg");
  expect(common.picture[0].data.length, "picture length").toBe(6761);
});
