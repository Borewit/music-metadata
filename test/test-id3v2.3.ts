import { describe, test, expect } from "vitest";
import { join } from "node:path";
import { fromFile } from "../lib/strtok3";

import { ID3v2Parser } from "../lib/id3v2/ID3v2Parser";
import { MetadataCollector } from "../lib/common/MetadataCollector";
import { orderTags } from "../lib";
import { samplePath } from "./util";
import { Parsers } from "./metadata-parsers";

// Extract metadata from ID3v2.3 header
test("should parse a raw ID3v2.3 header", async () => {
  const filePath = join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer.id3v23");

  const metadata = new MetadataCollector({});

  const tokenizer = await fromFile(filePath);
  await new ID3v2Parser().parse(metadata, tokenizer, {});
  expect(metadata.native["ID3v2.3"]).toHaveLength(33);
  const id3v23 = orderTags(metadata.native["ID3v2.3"]);
  expect(id3v23.UFID, "check if ID3v2.3-UFID is set").toBeDefined();
});

describe.each(Parsers)("parser: %s", (parser) => {
  test("parse a ID3v2.3", async () => {
    const filePath = join(samplePath, "id3v2.3.mp3");

    const metadata = await parser.initParser(filePath, "audio/mpeg", { duration: true });

    const format = metadata.format;
    const common = metadata.common;
    const id3v11 = orderTags(metadata.native.ID3v1);
    const id3v23 = orderTags(metadata.native["ID3v2.3"]);

    expect(format.tagTypes, "format.type").toStrictEqual(["ID3v2.3", "ID3v1"]);
    // FooBar says 0.732 seconds (32.727 samples)
    expect(format.duration, "format.duration").toBe(0.783_673_469_387_755_1);
    expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(44_100);
    expect(format.bitrate, "format.bitrate = 128 kbit/sec").toBe(128_000);
    expect(format.numberOfChannels, "format.numberOfChannels 2 (stereo)").toBe(2);
    expect(format.container, "format.container").toBe("MPEG");
    expect(format.codec, "format.codec").toBe("MPEG 1 Layer 3");
    expect(format.tool, "format.tool").toBe("LAME 3.98r");
    expect(format.codecProfile, "format.codecProfile").toBe("CBR");

    expect(common.title, "common.title").toBe("Home");
    expect(common.artists, "common.artists").toStrictEqual(["Explosions In The Sky", "Another", "And Another"]);
    expect(common.albumartist, "common.albumartist").toBe("Soundtrack");
    expect(common.album, "common.album").toBe("Friday Night Lights [Original Movie Soundtrack]");
    expect(common.year, "common.year").toBe(2004);
    expect(common.track.no, "common.track.no").toBe(5);
    expect(common.track.of, "common.track.of").toBeNull();
    expect(common.disk.no, "common.disk.no").toBe(1);
    expect(common.disk.of, "common.disk.of").toBe(1);
    expect(common.genre[0], "common.genre").toBe("Soundtrack");
    expect(common.picture[0].format, "common.picture format").toBe("image/jpeg");
    expect(common.picture[0].data.length, "common.picture length").toBe(80_938);

    expect(id3v11.title, "id3v11.title").toStrictEqual(["Home"]);
    expect(id3v11.album, "id3v11.album").toStrictEqual(["Friday Night Lights [Original"]);
    expect(id3v11.artist, "id3v11.artist").toStrictEqual(["Explosions In The Sky/Another/"]);
    expect(id3v11.genre, "id3v11.genre").toStrictEqual(["Soundtrack"]);
    expect(id3v11.track, "id3v11.track").toStrictEqual([5]);
    expect(id3v11.year, "id3v11.year").toStrictEqual(["2004"]);

    expect(id3v23.TALB, "native: TALB").toStrictEqual(["Friday Night Lights [Original Movie Soundtrack]"]);
    expect(id3v23.TPE1, "native: TPE1").toStrictEqual(["Explosions In The Sky", "Another", "And Another"]);
    expect(id3v23.TPE2, "native: TPE2").toStrictEqual(["Soundtrack"]);
    expect(id3v23.TCOM, "native: TCOM").toStrictEqual(["Explosions in the Sky"]);
    expect(id3v23.TPOS, "native: TPOS").toStrictEqual(["1/1"]);
    expect(id3v23.TCON, "native: TCON").toStrictEqual(["Soundtrack"]);
    expect(id3v23.TIT2, "native: TIT2").toStrictEqual(["Home"]);
    expect(id3v23.TRCK, "native: TRCK").toStrictEqual(["5"]);
    expect(id3v23.TYER, "native: TYER").toStrictEqual(["2004"]);
    expect(id3v23["TXXX:PERFORMER"], "native: TXXX:PERFORMER").toStrictEqual(["Explosions In The Sky"]);

    const apic = id3v23.APIC[0];
    expect(apic.format, "raw APIC format").toBe("image/jpeg");
    expect(apic.type, "raw APIC tagTypes").toBe("Cover (front)");
    expect(apic.description, "raw APIC description").toBe("");
    expect(apic.data.length, "raw APIC length").toBe(80_938);
  });

  describe("corrupt header / tags", () => {
    test("should decode corrupt ID3v2.3 header: 'Strawberry'", async () => {
      /**
       * Kept 25 frames from original MP3; concatenated copied last 128 bytes to restore ID3v1.0 header
       */
      const filePath = join(samplePath, "04-Strawberry.mp3");

      const metadata = await parser.initParser(filePath);

      const format = metadata.format;
      const common = metadata.common;

      expect(format.duration, "format.duration").toBe(247.849_795_918_367_33);
      expect(format.tagTypes, "format.tagTypes").toStrictEqual(["ID3v2.3"]);
      expect(format.container, "format.container").toBe("MPEG");
      expect(format.codec, "format.codec").toBe("MPEG 1 Layer 3");
      expect(format.lossless, "format.lossless").toBe(false);
      expect(format.sampleRate, "format.sampleRate = 44.1 kHz").toBe(44_100);
      expect(format.bitrate, "format.bitrate = 128 bit/sec").toBe(128_000);
      expect(format.numberOfChannels, "format.numberOfChannels 2 (stereo)").toBe(2);

      expect(common.title, "common.title").toBe("Strawberry");
      expect(common.artist, "common.artist").toBe("Union Youth");
      expect(common.album, "common.album").toBe("The Royal Gene");
      expect(common.albumartist, "common.albumartist").toBeUndefined();
      expect(common.year, "common.year").toBe(2002);
      expect(common.track, "common.track = 4/?").toStrictEqual({
        no: 4,
        of: null,
      });
      expect(common.track.of, "common.track.of = null").toBeNull();
      expect(common.genre, "common.genre").toStrictEqual(["Alternative"]);
      expect(common.comment, "common.comment").toBeUndefined();
    });

    test("should decode PeakValue without data", async () => {
      const filePath = join(samplePath, "issue_56.mp3");

      const metadata = await parser.initParser(filePath, "audio/mpeg", { duration: true });

      if (parser.description !== "parseStream") {
        expect(metadata.format.tagTypes, "format.tagTypes").toStrictEqual(["ID3v2.3", "APEv2", "ID3v1"]);
      } else {
        expect(metadata.format.tagTypes, "format.tagTypes").toStrictEqual(["ID3v2.3", "ID3v1"]);
      }
      // ToDo: has hale APEv2 tag header
    });
  });

  /**
   * id3v2.4 defines that multiple T* values are separated by 0x00
   * id3v2.3 defines that multiple T* values are separated by /
   * Related issue: https://github.com/Borewit/music-metadata/issues/52
   * Specification: http://id3.org/id3v2.3.0#line-290
   */
  test("slash delimited fields", async () => {
    const filePath = join(samplePath, "Their - They're - Therapy - 1sec.mp3");

    const metadata = await parser.initParser(filePath);
    expect(metadata.native["ID3v2.3"], "Expect ID3v2.3 tag").toBeDefined();
    const id3v23 = orderTags(metadata.native["ID3v2.3"]);
    // It should not split the id3v23.TIT2 tag (containing '/')
    expect(id3v23.TIT2, "id3v23.TIT2").toStrictEqual(["Their / They're / Therapy"]);
    // The artist name is actually "Their / They're / There"
    // Specification: http://id3.org/id3v2.3.0#line-455
    expect(id3v23.TPE1, "id3v23.TPE1").toStrictEqual(["Their", "They're", "There"]);
  });

  test("null delimited fields (non-standard)", async () => {
    const filePath = join(samplePath, "mp3", "null-separator.id3v2.3.mp3");

    const { format, common, native, quality } = await parser.initParser(filePath);

    expect(format.container, "format.container").toBe("MPEG");
    expect(format.codec, "format.codec").toBe("MPEG 1 Layer 3");
    expect(format.tagTypes, "format.tagTypes").toStrictEqual(["ID3v2.3"]);

    const id3v23 = orderTags(native["ID3v2.3"]);
    expect(id3v23.TPE1, "null separated id3v23.TPE1").toStrictEqual(["2 Unlimited2", "Ray", "Anita"]);

    expect(common.artists, "common.artists").toStrictEqual(["2 Unlimited2", "Ray", "Anita"]);
    expect(common.comment, "common.comment").toStrictEqual(["[DJSet]", "[All]"]);
    expect(common.genre, "common.genre").toStrictEqual(["Dance", "Classics"]);

    for (const tag of ["TPE1", "TCOM", "TCON"]) {
      expect(quality.warnings, `expect warning: null separator ID3v2.3 ${tag}`).toContainEqual({
        message: `ID3v2.3 ${tag} uses non standard null-separator.`,
      });
    }
  });

  describe("4.2.1 Text information frames", () => {
    // http://id3.org/id3v2.3.0#line-299
    test("TCON: Content type (genres)", async () => {
      const filePath = join(samplePath, "mp3", "tcon.mp3");
      const { format, common } = await parser.initParser(filePath);
      expect(format.container, "format.container").toBe("MPEG");
      expect(format.codec, "format.codec").toBe("MPEG 2 Layer 3");
      expect(common.genre, "common.genre").toStrictEqual(["Electronic", "Pop-Folk"]);
    });
  });

  describe("Decode frames", () => {
    // http://id3.org/id3v2.3.0#URL_link_frames_-_details
    test("4.3.1 WCOM: Commercial information", async () => {
      const metadata = await parser.initParser(join(samplePath, "id3v2-lyrics.mp3"));
      const id3v23 = orderTags(metadata.native["ID3v2.3"]);
      expect(id3v23.WCOM[0]).toBe(
        /* eslint-disable-next-line max-len */
        "http://www.amazon.com/Rotation-Cute-What-We-Aim/dp/B0018QCXAU%3FSubscriptionId%3D0R6CGKPJ3EKNPQBPYJR2%26tag%3Dsoftpointer-20%26linkCode%3Dxm2%26camp%3D2025%26creative%3D165953%26creativeASIN%3DB0018QCXAU "
      );
    });

    describe("4.3.2 WXXX: User defined URL link frame", () => {
      // http://id3.org/id3v2.3.0#User_defined_URL_link_frame
      test("decoding #1", async () => {
        const metadata = await parser.initParser(join(samplePath, "bug-unkown encoding.mp3"));
        const id3v23 = orderTags(metadata.native["ID3v2.3"]);
        expect(id3v23.WXXX[0]).toStrictEqual({
          description: "Tempa at bleep",
          url: "http://www.bleep.com/tempa",
        });
      });

      test.skipIf(parser.description === "parseBuffer")("decoding #2", async () => {
        const filePath = join(samplePath, "mp3", "issue-453.mp3");

        const metadata = await parser.initParser(filePath);
        expect(metadata.format.tagTypes).toStrictEqual(["ID3v2.3", "ID3v1"]);

        const id3 = orderTags(metadata.native["ID3v2.3"]);
        expect(id3.WXXX[0]).toStrictEqual({
          description: "あ",
          url: "https://www.example.com",
        });
      });
    });

    // http://id3.org/id3v2.3.0#Music_CD_identifier
    test("4.5 MCDI: Music CD identifier", async () => {
      const metadata = await parser.initParser(join(samplePath, "04-Strawberry.mp3"));
      const id3v23 = orderTags(metadata.native["ID3v2.3"]);
      expect(id3v23.MCDI[0], "TOC").toHaveLength(804);
    });

    // http://id3.org/id3v2.3.0#General_encapsulated_object
    // Issue: https://github.com/Borewit/music-metadata/issues/406
    test("4.16 GEOB: General encapsulated object", async () => {
      const filePath = join(samplePath, "mp3", "issue-406-geob.mp3");

      const { format, common, native } = await parser.initParser(filePath);

      await parser.initParser(filePath);

      expect(format.container, "format.container").toBe("MPEG");
      expect(format.tagTypes, "format.tagTypes").toStrictEqual(["ID3v2.3"]);

      expect(common.title, "common.title").toBe("test");

      const id3v2 = orderTags(native["ID3v2.3"]);
      expect(id3v2.GEOB[0].type, "ID3v2.GEOB[0].type").toBe("application/octet-stream");
      expect(id3v2.GEOB[0].filename, "ID3v2.GEOB[0].filename").toBe("");
      expect(id3v2.GEOB[0].description, "ID3v2.GEOB[0].description").toBe("Serato Overview");
    });

    describe("TXXX", () => {
      test("Handle empty TXXX", async () => {
        const { format, quality, common } = await parser.initParser(join(samplePath, "mp3", "issue-471.mp3"));

        expect(format.container, "format.container").toBe("MPEG");
        expect(format.codec, "format.codec").toBe("MPEG 1 Layer 3");
        expect(format.duration, "format.duration").toBeCloseTo(309.629_387_755_102, 2);
        expect(format.sampleRate, "format.sampleRate").toBe(44_100);
        expect(format.bitrate, "format.bitrate").toBe(128_000);

        expect(quality.warnings, "quality.warnings includes: 'id3v2.3 header has empty tag type=TXXX'").toContainEqual({
          message: "id3v2.3 header has empty tag type=TXXX",
        });

        expect(common.title, "common.title").toBe("Between Worlds");
        expect(common.artist, "common.artist").toBe("Roger Subirana");
        expect(common.album, "common.album").toBe("XII");
      });
    });

    describe("PRIV", () => {
      test("Handle empty PRIV tag", async () => {
        const filePath = join(samplePath, "mp3", "issue-691.mp3");
        const { format, quality } = await parser.initParser(filePath);

        expect(format.container, "format.container").toBe("MPEG");
        expect(format.codec, "format.codec").toBe("MPEG 1 Layer 3");

        expect(quality.warnings, "quality.warnings includes").toEqual(
          expect.arrayContaining([
            { message: "id3v2.3 header has empty tag type=PRIV" },
            {
              message: "Invalid ID3v2.3 frame-header-ID: \u0000\u0000\u0000\u0000",
            },
          ])
        );
      });
    });

    test("Handle ID32.2 tag ID's in ID32.3 header", async () => {
      const filePath = join(samplePath, "mp3", "issue-795.mp3");

      const { native, quality, common } = await parser.initParser(filePath);
      expect(native["ID3v2.3"], "native['ID3v2.3']").toBeDefined();
      expect(
        native["ID3v2.3"].map((tag) => tag.id),
        "Decode id3v2.3 TAG names"
      ).toStrictEqual(["TP1\u0000", "TP2\u0000", "TAL\u0000", "TEN\u0000", "TIT2"]);

      expect(quality.warnings, "Warning invalid ID: TP1\u0000, TP2\u0000, TAL\u0000 & TEN\u0000").toEqual(
        expect.arrayContaining([
          { message: "Invalid ID3v2.3 frame-header-ID: TP1\u0000" },
          { message: "Invalid ID3v2.3 frame-header-ID: TP2\u0000" },
          { message: "Invalid ID3v2.3 frame-header-ID: TAL\u0000" },
          { message: "Invalid ID3v2.3 frame-header-ID: TEN\u0000" },
        ])
      );

      expect(common.title, "common.title").toBe("FDP (Clean Edit)");
    });
  });
});
