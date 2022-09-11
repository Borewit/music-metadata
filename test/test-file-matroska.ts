import { describe, test, expect } from "vitest";
import { join } from "node:path";
import { samplePath } from "./util";
import { Parsers } from "./metadata-parsers";

const matroskaSamplePath = join(samplePath, "matroska");

describe.each(Parsers)("parser: %s", (_, parser) => {
  describe("Matroska audio (.mka)", () => {
    test('parse: "alac-in-matroska-short.mka"', async () => {
      const mkaPath = join(matroskaSamplePath, "alac-in-matroska-short.mka");

      const { format } = await parser(mkaPath, "audio/matroska", { duration: false });

      // format chunk information
      expect(format.container, "format.container").toBe("EBML/matroska");
      expect(format.codec, "format.codec").toBe("ALAC");
      expect(format.duration, "format.duration").toBeCloseTo(196_608 / 41_000, 5);
      expect(format.sampleRate, "format.sampleRate").toBe(41_000);
      expect(format.numberOfChannels, "format.numberOfChannels").toBe(2);
    });

    test('parse: "02 - Poxfil - Solid Ground (5 sec).mka"', async () => {
      const mkaPath = join(matroskaSamplePath, "02 - Poxfil - Solid Ground (5 sec).mka");

      const metadata = await parser(mkaPath, "audio/matroska", { duration: false });
      const format = metadata.format;
      const common = metadata.common;

      // format chunk information
      expect(format.container, "format.container").toBe("EBML/matroska");
      expect(format.codec, "format.codec").toBe("AAC");
      expect(format.duration, "format.duration").toBeCloseTo(221_184 / 44_100, 5);
      expect(format.sampleRate, "format.sampleRate").toBe(44_100);
      expect(format.numberOfChannels, "format.numberOfChannels").toBe(2);

      // Common mapped EBML tags
      expect(common.title, "common.title").toBe("Solid Ground");
      expect(common.artist, "common.artist").toBe("Poxfil");
      expect(common.artistsort, "common.artistsort").toBe("Poxfil");
      expect(common.label, "common.label").toStrictEqual(["blocSonic"]);
      expect(common.musicbrainz_albumid, "common.musicbrainz_albumid").toBe("abf39f57-0b01-4b51-9c1e-b21e8ada5091");
      expect(common.musicbrainz_artistid, "common.musicbrainz_artistid").toStrictEqual([
        "ee315b01-df5e-451e-8cd6-90a9f1faaf51",
      ]);
      expect(common.musicbrainz_recordingid, "common.musicbrainz_recordingid").toBe(
        "209dbf50-509d-4ac3-aec5-e96da99dfdd9"
      );
      expect(common.track, "common.track").toStrictEqual({ no: 2, of: 10 });
    });
  });

  describe("WebM", () => {
    test('parse: "big-buck-bunny_trailer-short.vp8.webm"', async () => {
      const webmPath = join(matroskaSamplePath, "big-buck-bunny_trailer-short.vp8.webm");

      const metadata = await parser(webmPath, "audio/webm", { duration: false });
      const format = metadata.format;
      const common = metadata.common;

      // format chunk information
      expect(format.container, "format.container").toBe("EBML/webm");
      expect(format.codec, "format.codec").toBe("VORBIS");
      expect(format.duration, "format.duration").toBeCloseTo(7.143, 5);
      expect(format.sampleRate, "format.sampleRate").toBe(44_100);

      // common metadata
      expect(common.title, "common.title").toBe("Big Buck Bunny");
      expect(common.picture, "common.picture").toBeDefined();
      expect(common.picture[0].format, "common.picture[0].format").toBe("image/jpeg");
      expect(common.picture[0].description, "common.picture[0].description").toBe("Poster");
      expect(common.picture[0].name, "common.picture[0].name").toBe("Big buck bunny poster.jpg");
    });

    test('parse: "02 - Poxfil - Solid Ground (5 sec).opus.webm"', async () => {
      const webmPath = join(matroskaSamplePath, "02 - Poxfil - Solid Ground (5 sec).opus.webm");

      const metadata = await parser(webmPath, "audio/webm", { duration: false });
      const format = metadata.format;
      const common = metadata.common;

      // format chunk information
      expect(format.container, "format.container").toBe("EBML/webm");
      expect(format.codec, "format.codec").toBe("OPUS");
      expect(format.duration, "format.duration").toBeCloseTo(5.006_51, 5);
      expect(format.sampleRate, "format.sampleRate").toBe(44_100);

      expect(common.title, "common.title").toBe("Solid Ground");
      expect(common.artist, "common.artist").toBe("Poxfil");
      expect(common.track, "common.track").toStrictEqual({ no: 2, of: 10 });
      expect(common.encodedby, "common.encodersettings").toBe("Max 0.8b");
      expect(common.encodersettings, "common.encodersettings").toBe("--bitrate 96 --vbr");
    });

    test('should parse "My Baby Boy.webm"', async () => {
      const filePath = join(matroskaSamplePath, "My Baby Boy.webm");

      const metadata = await parser(filePath, "audio/webm", { duration: true });
      const format = metadata.format;
      const common = metadata.common;
      // const native = metadata.native;

      expect(format.container, "format.container").toBe("EBML/webm");
      expect(format.codec, "format.codec").toBe("OPUS");

      expect(common.title, "common.title").toBe("My Baby Boy");
      expect(common.artist, "common.artist").toBe("theAngelcy");
      expect(common.albumartist, "common.albumartist").toBe("theAngelcy");
      expect(common.track, "common.track").toStrictEqual({ no: 2, of: 13 });
      expect(common.disk, "common.disk").toStrictEqual({ no: 1, of: 1 });
      expect(common.genre, "common.genre").toStrictEqual(["Folk"]);
      expect(common.encodedby, "common.encodersettings").toBe("opusenc from opus-tools 0.2");
      expect(common.encodersettings, "common.encodersettings").toBe("--bitrate 96 --vbr");
    });

    test("shoud ignore trailing null characters", async () => {
      const webmPath = join(matroskaSamplePath, "fixture-null.webm");
      const metadata = await parser(webmPath, "audio/webm", { duration: false });
      const format = metadata.format;

      expect(format.container, "format.container").toBe("EBML/webm");
    });
  });

  // https://github.com/Borewit/music-metadata/issues/384
  describe("Multiple audio tracks", () => {
    test('parse: "matroska-test-w1-test5-short.mkv"', async () => {
      const mkvPath = join(matroskaSamplePath, "matroska-test-w1-test5-short.mkv");

      const metadata = await parser(mkvPath);
      const format = metadata.format;
      const common = metadata.common;

      expect(format.container, "format.container").toBe("EBML/matroska");
      expect(format.tagTypes, "format.tagTypes").toStrictEqual(["matroska"]);

      expect(format.codec, "format.codec").toBe("AAC");
      expect(format.duration, "format.duration").toBeCloseTo(3.417, 5);
      expect(format.sampleRate, "format.sampleRate").toBe(48_000);
      expect(format.numberOfChannels, "format.numberOfChannels").toBe(2);

      expect(common.title, "common.title").toBe("Elephant Dreams");
      expect(common.album, "common.album").toBe("Matroska Test Files - Wave 1");
    });
  });

  // https://www.matroska.org/technical/streaming.html
  // https://github.com/Borewit/music-metadata/issues/765
  describe("Parse Matroska Stream", () => {
    const mkvPath = join(matroskaSamplePath, "stream.weba");

    test("Parse stream", async () => {
      const metadata = await parser(mkvPath);
      const format = metadata.format;

      expect(format.container, "format.container").toBe("EBML/webm");
      expect(format.codec, "format.codec").toBe("OPUS");
      expect(format.numberOfChannels, "format.numberOfChannels").toBe(1);
    });
  });
});
