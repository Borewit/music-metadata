import { assert } from "chai";
import * as path from "path";

import * as mm from "../lib";
import { ID3v2Parser } from "../lib/id3v2/ID3v2Parser";
import { parseGenre } from "../lib/id3v2/FrameParser";
import { samplePath } from "./util";

describe("ID3v2Parser", () => {
  const mp3Path = path.join(samplePath, "mp3");

  it("should be able to remove unsynchronisation bytes from buffer", () => {
    const expected = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    const sample = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0xe0, 0x00]);
    const output = ID3v2Parser.removeUnsyncBytes(sample);
    assert.deepEqual(output, expected, "bytes");
  });

  it("should normalize ID3v2.2 comments correctly", async () => {
    const filePath = path.join(samplePath, "issue_66.mp3");

    const metadata = await mm.parseFile(filePath, { duration: true });

    const id3v22 = mm.orderTags(metadata.native["ID3v2.2"]);

    assert.deepEqual(id3v22.TP1, ["RushJet1"], "['ID3v2.2'].TP1");
    assert.deepEqual(id3v22.TRK, ["2/15"], "['ID3v2.2'].TRK");
    assert.deepEqual(id3v22.TYE, ["2011"], "['ID3v2.2'].TYE");
    assert.deepEqual(
      id3v22["COM:iTunPGAP"],
      ["0"],
      "['ID3v2.2']['COM:iTunPGAP']"
    );
    assert.deepEqual(id3v22.TEN, ["iTunes 10.2.2.14"], "['ID3v2.2'].TEN");
    assert.deepEqual(
      id3v22["COM:iTunNORM"],
      [
        " 00000308 00000000 00001627 00000000 00006FD6 00000000 00007F21 00000000 0000BE68 00000000",
      ],
      "COM:iTunNORM"
    );
    assert.deepEqual(
      id3v22["COM:iTunSMPB"],
      [
        " 00000000 00000210 00000811 000000000043E1DF 00000000 001EBD63 00000000 00000000 00000000 00000000 00000000 00000000",
      ],
      "id3v22.TYE['COM:iTunSMPB']"
    );

    assert.isDefined(id3v22.PIC, "['ID3v2.2'].PIC");
    assert.deepEqual(id3v22.TCO, ["Chiptune"], "['ID3v2.2'].TCO");
    assert.deepEqual(id3v22.TAL, ["Forgotten Music"], "['ID3v2.2'].TAL");
    assert.deepEqual(id3v22.TT2, ["Ancient Ruin Adventure"], "['ID3v2.2'].TT2");

    assert.deepEqual(
      id3v22.COM,
      [
        "UBI025, 23.05.2011, http://ubiktune.org/releases/ubi025-rushjet1-forgotten-music",
      ],
      "['ID3v2.2']['COM']"
    );

    assert.deepEqual(
      metadata.common.comment,
      [
        "UBI025, 23.05.2011, http://ubiktune.org/releases/ubi025-rushjet1-forgotten-music",
      ],
      "common.comment"
    );
  });

  it("should decode file 'id3v2.2.mp3'", async () => {
    const filename = "id3v2.2.mp3";
    const filePath = path.join(__dirname, "samples", filename);

    const metadata = await mm.parseFile(filePath, { duration: true });
    assert.strictEqual(metadata.common.title, "You Are The One", "title");
    assert.strictEqual(metadata.common.artist, "Shiny Toy Guns", "artist");
    assert.strictEqual(metadata.common.album, "We Are Pilots", "album");
    assert.strictEqual(metadata.common.year, 2006, "year");
    assert.strictEqual(metadata.common.track.no, 1, "track no");
    assert.strictEqual(metadata.common.track.of, 11, "track of");
    assert.deepEqual(metadata.common.genre, ["Alternative"], "genre");
    assert.strictEqual(
      metadata.common.picture[0].format,
      "image/jpeg",
      "picture format"
    );
    assert.strictEqual(
      metadata.common.picture[0].data.length,
      99738,
      "picture length"
    );
    assert.strictEqual(metadata.common.gapless, false, "common.gapless");
    assert.isUndefined(metadata.common.comment, "common.comment");

    assert.isDefined(
      metadata.native["ID3v2.2"],
      "Native id3v2.2 tags should be present"
    );
    const id3v22 = mm.orderTags(metadata.native["ID3v2.2"]);

    assert.deepEqual(id3v22.TP1, ["Shiny Toy Guns"], "['ID3v2.2'].TP1");
    assert.deepEqual(id3v22.TRK, ["1/11"], "['ID3v2.2'].TRK");
    assert.deepEqual(id3v22.TYE, ["2006"], "['ID3v2.2'].TYE");
    assert.deepEqual(
      id3v22["COM:iTunPGAP"],
      ["0"],
      "['ID3v2.2']['COM:iTunPGAP']"
    );
    assert.deepEqual(id3v22.TEN, ["iTunes v7.0.2.16"], "['ID3v2.2'].TEN");
    assert.deepEqual(
      id3v22["COM:iTunNORM"],
      [
        " 0000299C 0000291D 0000DBE0 0000D6BA 0003C378 0003C2C1 0000902A 00008F1B 00012FC6 00015FBC",
      ],
      "COM:iTunNORM"
    );

    assert.deepEqual(
      id3v22["COM:iTunSMPB"],
      [
        " 00000000 00000210 00000AD4 0000000000B6499C 00000000 006327AD 00000000 00000000 00000000 00000000 00000000 00000000",
      ],
      "id3v22.TYE['COM:iTunSMPB']"
    );

    assert.deepEqual(
      id3v22["COM:iTunes_CDDB_IDs"],
      ["11+3ABC77F16B8A2F0F1E1A1EBAB868A98F+8210091"],
      "COM:iTunes_CDDB_IDs"
    );

    assert.isDefined(id3v22.PIC, "['ID3v2.2'].PIC");
    assert.deepEqual(id3v22.TCO, ["Alternative"], "['ID3v2.2'].TCO");
    assert.deepEqual(id3v22.TAL, ["We Are Pilots"], "['ID3v2.2'].TAL");
    assert.deepEqual(id3v22.TT2, ["You Are The One"], "['ID3v2.2'].TT2");

    assert.deepEqual(
      id3v22.ULT,
      [
        {
          description: "",
          language: "eng",
          /* eslint-disable max-len */
          text: "Black rose & a radio fire\nits so contagious\nsuch something changing my mind\nim gonna take whats evil\n\nYour cover melting inside\nwith wide eyes you tremble\nkissing over & over again\nyour god knows his faithful\n\nI try - to digest my pride\nbut passions grip i fear\nwhen i climb - into shallow vats of wine\ni think i almost hear - but its not clear\n\nYou are the one\nyou'll never be alone again\nyou're more then in my head - your more\n\nSpin faster shouting out loud\nyou cant steal whats paid for\nsuch something hurting again\nmurder son shes painful\n\nYou so believe your own lies\non my skin your fingers\nrunaway until the last time\nwere gonna lose forever\n\nwhen you try - don't try to say you wont\ntry to crawl into my head\nwhen you cry - cause it's all built up inside\nyour tears already said - already said\n\nYou'll never be alone again",
        },
      ],
      "['ID3v2.2'].ULT"
    );
  });

  it("05 I Believe You.mp3", async () => {
    const filePath = path.join(mp3Path, "issue-641.mp3");
    const { format, common } = await mm.parseFile(filePath);

    assert.strictEqual(format.container, "MPEG", "format.container");
    assert.strictEqual(format.codec, "MPEG 1 Layer 3", "format.codec");
    assert.strictEqual(format.sampleRate, 44100, "format.sampleRate");
    const pics = common.picture;
    assert.strictEqual(pics[0].format, "image/jpeg", "picture format");
    assert.strictEqual(pics[0].type, "Cover (front)", "picture type");
  });

  describe("Tag mapping", () => {
    it("TBP (beats per minute)", async () => {
      const filePath = path.join(samplePath, "mp3", "Betty Lou.mp3");

      const { format, common, native } = await mm.parseFile(filePath, {
        duration: true,
      });
      assert.strictEqual(format.container, "MPEG", "format.container");
      assert.strictEqual(format.codec, "MPEG 1 Layer 3", "format.codec");

      assert.strictEqual(common.title, "Betty Lou", "common.title");
      assert.strictEqual(common.artist, "The Hub Caps", "common.artist,");

      assert.strictEqual(common.bpm, 177, "common.bpm,");
    });
  });
});

describe("Post parse genre", () => {
  it("should be able to parse genres", () => {
    const tests = {
      Electronic: ["Electronic"],
      "(52)(RX)": ["Electronic", "Remix"],
      "(52)(CR)": ["Electronic", "Cover"],
      "(0)": ["Blues"],
      "(0)(1)(2)": ["Blues", "Classic Rock", "Country"],
      "(0)(160)(2)": ["Blues", "Electroclash", "Country"],
      "(0)(192)(2)": ["Blues", "Country"],
      "(0)(255)(2)": ["Blues", "Country"],
      "(4)Eurodisco": ["Disco", "Eurodisco"],
      "(4)Eurodisco(0)Mopey": ["Disco", "Eurodisco", "Blues", "Mopey"],
      "(RX)(CR)": ["Remix", "Cover"],
      "1stuff": ["1stuff"],
      "RX/CR": ["RX/CR"],
      "((52)(RX)": ["(52)", "Remix"],
      "((52)((RX)": ["(52)(RX)"],
      52: ["Electronic"],
    };
    for (const test in tests) {
      assert.deepStrictEqual(
        parseGenre(test),
        tests[test],
        `parse genre: "${test}"`
      );
    }
  });
});
