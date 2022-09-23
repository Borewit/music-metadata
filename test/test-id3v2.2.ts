import { join } from "node:path";

import { describe, test, expect } from "vitest";

import { orderTags } from "../lib";
import { parseGenre } from "../lib/id3v2/FrameParser";
import { ID3v2Parser } from "../lib/id3v2/ID3v2Parser";

import { Parsers } from "./metadata-parsers";
import { samplePath } from "./util";

describe.each(Parsers)("ID3v2Parser %s", (_, parser) => {
  const mp3Path = join(samplePath, "mp3");

  test("should be able to remove unsynchronisation bytes from buffer", () => {
    const expected = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    const sample = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0xe0, 0x00]);
    const output = ID3v2Parser.removeUnsyncBytes(sample);

    expect(output, "bytes").toStrictEqual(expected);
  });

  test("should normalize ID3v2.2 comments correctly", async () => {
    const filePath = join(samplePath, "issue_66.mp3");
    const metadata = await parser(filePath, "audio/mp3", { duration: true });

    const id3v22 = orderTags(metadata.native["ID3v2.2"]);

    expect(id3v22.TP1, "['ID3v2.2'].TP1").toStrictEqual(["RushJet1"]);
    expect(id3v22.TRK, "['ID3v2.2'].TRK").toStrictEqual(["2/15"]);
    expect(id3v22.TYE, "['ID3v2.2'].TYE").toStrictEqual(["2011"]);
    expect(id3v22["COM:iTunPGAP"], "['ID3v2.2']['COM:iTunPGAP']").toStrictEqual(["0"]);
    expect(id3v22.TEN, "['ID3v2.2'].TEN").toStrictEqual(["iTunes 10.2.2.14"]);
    expect(id3v22["COM:iTunNORM"], "COM:iTunNORM").toStrictEqual([
      " 00000308 00000000 00001627 00000000 00006FD6 00000000 00007F21 00000000 0000BE68 00000000",
    ]);
    expect(id3v22["COM:iTunSMPB"], "id3v22.TYE['COM:iTunSMPB']").toStrictEqual([
      " 00000000 00000210 00000811 000000000043E1DF 00000000 001EBD63 00000000 00000000 00000000 00000000 00000000 00000000",
    ]);

    expect(id3v22.PIC, "['ID3v2.2'].PIC").toBeDefined();
    expect(id3v22.TCO, "['ID3v2.2'].TCO").toStrictEqual(["Chiptune"]);
    expect(id3v22.TAL, "['ID3v2.2'].TAL").toStrictEqual(["Forgotten Music"]);
    expect(id3v22.TT2, "['ID3v2.2'].TT2").toStrictEqual(["Ancient Ruin Adventure"]);

    expect(id3v22.COM, "['ID3v2.2']['COM']").toStrictEqual([
      "UBI025, 23.05.2011, http://ubiktune.org/releases/ubi025-rushjet1-forgotten-music",
    ]);

    expect(metadata.common.comment, "common.comment").toStrictEqual([
      "UBI025, 23.05.2011, http://ubiktune.org/releases/ubi025-rushjet1-forgotten-music",
    ]);
  });

  test("should decode file 'id3v2.2.mp3'", async () => {
    const filename = "id3v2.2.mp3";
    const filePath = join(__dirname, "samples", filename);

    const metadata = await parser(filePath, "audio/mp3", { duration: true });
    expect(metadata.common.title, "title").toBe("You Are The One");
    expect(metadata.common.artist, "artist").toBe("Shiny Toy Guns");
    expect(metadata.common.album, "album").toBe("We Are Pilots");
    expect(metadata.common.year, "year").toBe(2006);
    expect(metadata.common.track.no, "track no").toBe(1);
    expect(metadata.common.track.of, "track of").toBe(11);
    expect(metadata.common.genre, "genre").toStrictEqual(["Alternative"]);
    expect(metadata.common.picture![0].format, "picture format").toBe("image/jpeg");
    expect(metadata.common.picture![0].data.length, "picture length").toBe(99_738);
    expect(metadata.common.gapless, "common.gapless").toBe(false);
    expect(metadata.common.comment, "common.comment").toBeUndefined();

    expect(metadata.native["ID3v2.2"], "Native id3v2.2 tags should be present").toBeDefined();
    const id3v22 = orderTags(metadata.native["ID3v2.2"]);

    expect(id3v22.TP1, "['ID3v2.2'].TP1").toStrictEqual(["Shiny Toy Guns"]);
    expect(id3v22.TRK, "['ID3v2.2'].TRK").toStrictEqual(["1/11"]);
    expect(id3v22.TYE, "['ID3v2.2'].TYE").toStrictEqual(["2006"]);
    expect(id3v22["COM:iTunPGAP"], "['ID3v2.2']['COM:iTunPGAP']").toStrictEqual(["0"]);
    expect(id3v22.TEN, "['ID3v2.2'].TEN").toStrictEqual(["iTunes v7.0.2.16"]);
    expect(id3v22["COM:iTunNORM"], "COM:iTunNORM").toStrictEqual([
      " 0000299C 0000291D 0000DBE0 0000D6BA 0003C378 0003C2C1 0000902A 00008F1B 00012FC6 00015FBC",
    ]);

    expect(id3v22["COM:iTunSMPB"], "id3v22.TYE['COM:iTunSMPB']").toStrictEqual([
      " 00000000 00000210 00000AD4 0000000000B6499C 00000000 006327AD 00000000 00000000 00000000 00000000 00000000 00000000",
    ]);

    expect(id3v22["COM:iTunes_CDDB_IDs"], "COM:iTunes_CDDB_IDs").toStrictEqual([
      "11+3ABC77F16B8A2F0F1E1A1EBAB868A98F+8210091",
    ]);

    expect(id3v22.PIC, "['ID3v2.2'].PIC").toBeDefined();
    expect(id3v22.TCO, "['ID3v2.2'].TCO").toStrictEqual(["Alternative"]);
    expect(id3v22.TAL, "['ID3v2.2'].TAL").toStrictEqual(["We Are Pilots"]);
    expect(id3v22.TT2, "['ID3v2.2'].TT2").toStrictEqual(["You Are The One"]);

    expect(id3v22.ULT, "['ID3v2.2'].ULT").toStrictEqual([
      {
        description: "",
        language: "eng",
        text:
          "Black rose & a radio fire\n" +
          "its so contagious\n" +
          "such something changing my mind\n" +
          "im gonna take whats evil\n" +
          "\n" +
          "Your cover melting inside\n" +
          "with wide eyes you tremble\n" +
          "kissing over & over again\n" +
          "your god knows his faithful\n" +
          "\n" +
          "I try - to digest my pride\n" +
          "but passions grip i fear\n" +
          "when i climb - into shallow vats of wine\n" +
          "i think i almost hear - but its not clear\n" +
          "\n" +
          "You are the one\n" +
          "you'll never be alone again\n" +
          "you're more then in my head - your more\n" +
          "\n" +
          "Spin faster shouting out loud\n" +
          "you cant steal whats paid for\n" +
          "such something hurting again\n" +
          "murder son shes painful\n" +
          "\n" +
          "You so believe your own lies\n" +
          "on my skin your fingers\n" +
          "runaway until the last time\n" +
          "were gonna lose forever\n" +
          "\n" +
          "when you try - don't try to say you wont\n" +
          "try to crawl into my head\n" +
          "when you cry - cause it's all built up inside\n" +
          "your tears already said - already said\n" +
          "\n" +
          "You'll never be alone again",
      },
    ]);
  });

  test("05 I Believe You.mp3", async () => {
    const filePath = join(mp3Path, "issue-641.mp3");
    const { format, common } = await parser(filePath);

    expect(format.container, "format.container").toBe("MPEG");
    expect(format.codec, "format.codec").toBe("MPEG 1 Layer 3");
    expect(format.sampleRate, "format.sampleRate").toBe(44_100);
    const pics = common.picture;
    expect(pics![0].format, "picture format").toBe("image/jpeg");
    expect(pics![0].type, "picture type").toBe("Cover (front)");
  });

  describe("Tag mapping", () => {
    test("TBP (beats per minute)", async () => {
      const filePath = join(samplePath, "mp3", "Betty Lou.mp3");

      const { format, common } = await parser(filePath, "audio/mp3", {
        duration: true,
      });
      expect(format.container, "format.container").toBe("MPEG");
      expect(format.codec, "format.codec").toBe("MPEG 1 Layer 3");

      expect(common.title, "common.title").toBe("Betty Lou");
      expect(common.artist, "common.artist,").toBe("The Hub Caps");

      expect(common.bpm, "common.bpm,").toBe(177);
    });
  });
});

describe("Post parse genre", () => {
  const tests: [string, string[]][] = [
    ["52", ["Electronic"]],
    ["Electronic", ["Electronic"]],
    ["(52)(RX)", ["Electronic", "Remix"]],
    ["(52)(CR)", ["Electronic", "Cover"]],
    ["(0)", ["Blues"]],
    ["(0)(1)(2)", ["Blues", "Classic Rock", "Country"]],
    ["(0)(160)(2)", ["Blues", "Electroclash", "Country"]],
    ["(0)(192)(2)", ["Blues", "Country"]],
    ["(0)(255)(2)", ["Blues", "Country"]],
    ["(4)Eurodisco", ["Disco", "Eurodisco"]],
    ["(4)Eurodisco(0)Mopey", ["Disco", "Eurodisco", "Blues", "Mopey"]],
    ["(RX)(CR)", ["Remix", "Cover"]],
    ["1stuff", ["1stuff"]],
    ["RX/CR", ["RX/CR"]],
    ["((52)(RX)", ["(52)", "Remix"]],
    ["((52)((RX)", ["(52)(RX)"]],
  ];

  test.each(tests)("parse genres: %s", (source, expected) => {
    expect(parseGenre(source)).toStrictEqual(expected);
  });
});
