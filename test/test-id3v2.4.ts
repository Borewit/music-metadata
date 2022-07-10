import { test, expect } from "vitest";
import { parseFile } from "../lib";

import { join } from "node:path";
import { samplePath } from "./util";

test("should decode id3v2.4", async () => {
  const filename = "id3v2.4.mp3";
  const filePath = join(samplePath, filename);

  const metadata = await parseFile(filePath, { duration: true });
  const format = metadata.format;
  const common = metadata.common;

  expect(format.tagTypes, "format.tagTypes").toStrictEqual(["ID3v2.4", "ID3v1"]);
  expect(format.duration, "format.format.duration").toBe(0.783_673_469_387_755_1);
  expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(44_100);
  expect(format.bitrate, "format.bitrate = 128 kbit/sec").toBe(128_000);
  expect(format.codecProfile, "format.codecProfile = CBR").toBe("CBR");
  expect(format.container, "format.container").toBe("MPEG");
  expect(format.codec, "format.codec").toBe("MPEG 1 Layer 3");
  expect(format.tool, "format.tool").toBe("LAME 3.98r");
  expect(format.numberOfChannels, "format.numberOfChannels = 2").toBe(2);

  expect(common.title, "title").toBe("Home");
  expect(common.artist, "common.artist").toBe("Explo");
  expect(common.artists, "common.artists").toStrictEqual(["Explo", "ions", "nodejsftws"]);
  expect(common.albumartist, "albumartist").toBe("Soundtrack");
  expect(common.album, "album").toBe("Friday Night Lights [Original Movie Soundtrack]");
  expect(common.year, "year").toBe(2004);
  expect(common.track, "common.track").toStrictEqual({ no: 5, of: null });
  expect(common.disk, "common.disk").toStrictEqual({ no: 1, of: 1 });
  expect(common.genre, "common.genres").toStrictEqual(["Soundtrack", "OST"]);
  expect(common.picture[0].format, "common.picture 0 format").toBe("image/jpeg");
  expect(common.picture[0].data.length, "common.picture 0 length").toBe(80_938);
  expect(common.picture[1].format, "common.picture 1 format").toBe("image/jpeg");
  expect(common.picture[1].data.length, "common.picture 1 length").toBe(80_938);
});

// Issue: https://github.com/Borewit/music-metadata/issues/502
test("COMM mapping", async () => {
  const filePath = join(samplePath, "mp3", "issue-502.mp3");
  const { common } = await parseFile(filePath);
  expect(common.comment, "common.comment").toStrictEqual(["CLEAN"]);
});

test("should respect skipCovers-flag", async () => {
  const filename = "id3v2.4.mp3";
  const filePath = join(samplePath, filename);

  const result = await parseFile(filePath, {
    duration: true,
    skipCovers: true,
  });
  expect(result.common.picture, "common.picture should be undefined").toBeUndefined();
});

test("Map TXXX:ISRC", async () => {
  const filename = "issue-802.mp3";
  const filePath = join(samplePath, "mp3", filename);

  const { common, native } = await parseFile(filePath);
  const id3v24 = native["ID3v2.4"];
  expect(id3v24, "ID3v2.4 presence").toBeDefined();
  expect(
    id3v24.filter((tag) => tag.id === "TSRC"),
    "ID3v2.4 tag TSRC not defined"
  ).toHaveLength(0);
  expect(
    id3v24.filter((tag) => tag.id === "TXXX:ISRC"),
    "ID3v2.4 tag TXXX:ISRC to be defined"
  ).toHaveLength(1);
  expect(common.isrc, "ISRC").toContain("DEAE61300058");
});
