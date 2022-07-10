import { expect, test } from "vitest";
import { join } from "node:path";

import { parseFile } from "../lib";
import { samplePath } from "./util";

test("should MusicBrainz tags with id3v2.4", async () => {
  const filename = "id3v2.4-musicbrainz.mp3";
  const filePath = join(samplePath, filename);

  const metadata = await parseFile(filePath, { duration: true });
  const { common, format } = metadata;

  expect(format.duration, "format.duration").toBe(0.783_673_469_387_755_1);

  expect(common.title, "common.title").toBe("Home");
  expect(common.artist, "common.artist").toBe("Explosions in the Sky");
  expect(common.albumartist, "common.albumartist").toBe("Explosions in the Sky");
  expect(common.album, "common.album").toBe("Friday Night Lights: Original Motion Picture Soundtrack");
  expect(common.year, "common.year").toBe(2004);
  expect(common.date, "common.date").toBe("2004-10-12");
  expect(common.track, "common.track").toStrictEqual({ no: 5, of: 14 });
  expect(common.disk, "common.disk").toStrictEqual({ no: 1, of: 1 });
  expect(common.genre, "common.genre").toStrictEqual(["Soundtrack", "OST"]);
  expect(common.picture[0].format, "common.picture 0 format").toBe("image/jpeg");
  expect(common.picture[0].data.length, "common.picture 0 length").toBe(75_818);

  expect(common.barcode, "common.barcode").toBe("602498644102");
  expect(common.isrc, "common.isrc").toStrictEqual(["USUG10400421"]);
  expect(common.label, "common.label").toStrictEqual(["Hip-O Records"]);
  expect(common.catalognumber, "common.catalognumber").toStrictEqual(["B0003663-02"]);
  expect(common.releasecountry, "common.releasecountry").toBe("US");
  expect(common.media, "common.media").toBe("CD");
  expect(common.musicbrainz_artistid, "MusicBrainz Artist Id").toStrictEqual(["4236acde-2ce2-441c-a3d4-38d55f1b5474"]);
  expect(common.musicbrainz_recordingid, "MusicBrainz Recording Id").toBe("84851150-a196-48fa-ada5-1a012b1cd9ed");
  expect(common.musicbrainz_albumartistid, "MusicBrainz Release Artist Id").toStrictEqual([
    "4236acde-2ce2-441c-a3d4-38d55f1b5474",
  ]);
  expect(common.musicbrainz_releasegroupid, "MusicBrainz Release Group Id").toBe(
    "afe7c5d8-f8bc-32cf-b77d-8fb8561989a7"
  );
  expect(common.musicbrainz_albumid, "MusicBrainz Release Id").toBe("2644f258-0619-4beb-a150-0c0069ca6699");
  expect(common.musicbrainz_trackid, "MusicBrainz Track Id").toBe("d87d56d0-9bd3-3199-8ff3-d03dff3abb13");

  const native = metadata.native["ID3v2.4"];
  expect(native, "Native id3v2.4 tags should be present").toBeDefined();

  const nativeExpected: [number, { id: string; value: any }, string][] = [
    [0, { id: "TIT2", value: "Home" }, "['ID3v2.4'].TIT2"],
    [1, { id: "TPE1", value: "Explosions in the Sky" }, "['ID3v2.4'].TPE1"],
    [2, { id: "TRCK", value: "5/14" }, "['ID3v2.4'].TRCK"],
    [
      3,
      {
        id: "TALB",
        value: "Friday Night Lights: Original Motion Picture Soundtrack",
      },
      "['ID3v2.4'].TALB",
    ],
    [4, { id: "TPOS", value: "1/1" }, "['ID3v2.4'].TPOS"],
    [5, { id: "TDRC", value: "2004-10-12" }, "['ID3v2.4'].TDRC"],
    [6, { id: "TCON", value: "Soundtrack" }, "['ID3v2.4'].TCON #1"],
    [7, { id: "TCON", value: "OST" }, "['ID3v2.4'].TCON #2"],
    // 8: APIC
    [
      9,
      {
        id: "PRIV",
        value: {
          data: Buffer.from([0x02, 0x00, 0x00, 0x00]),
          owner_identifier: "AverageLevel",
        },
      },
      "['ID3v2.4'].PRIV.AverageLevel",
    ],
    [
      10,
      {
        id: "PRIV",
        value: {
          data: Buffer.from([0x08, 0x00, 0x00, 0x00]),
          owner_identifier: "PeakValue",
        },
      },
      "['ID3v2.4'].PRIV.PeakValue",
    ],
    [11, { id: "TCOM", value: "Explosions in the Sky" }, "['ID3v2.4'].TCOM"],
    [12, { id: "TDOR", value: "2004-10-12" }, "['ID3v2.4'].TDOR"],
    [
      13,
      {
        id: "TIPL",
        value: { producer: ["Brian Grazer", "Brian Reitzell", "Peter Berg"] },
      },
      "['ID3v2.4'].TIPL",
    ],
    [14, { id: "TMED", value: "CD" }, "['ID3v2.4'].TIPL"],
    [15, { id: "TPE2", value: "Explosions in the Sky" }, "['ID3v2.4'].TPE2"],
    [16, { id: "TPUB", value: "Hip-O Records" }, "['ID3v2.4'].TPUB"],
    [17, { id: "TSO2", value: "Explosions in the Sky" }, "['ID3v2.4'].TSO2"],
    [18, { id: "TSOP", value: "Explosions in the Sky" }, "['ID3v2.4'].TSOP"],
    [19, { id: "TSRC", value: "USUG10400421" }, "['ID3v2.4'].TSRC"],
    [20, { id: "TXXX:ASIN", value: "B000649YAM" }, "['ID3v2.4'].TXXX:ASIN"],
    [21, { id: "TXXX:Artists", value: "Explosions in the Sky" }, "['ID3v2.4'].TXXX:Artists"],
    [22, { id: "TXXX:BARCODE", value: "602498644102" }, "['ID3v2.4'].TXXX:BARCODE"],
    [23, { id: "TXXX:CATALOGNUMBER", value: "B0003663-02" }, "['ID3v2.4'].TXXX:CATALOGNUMBER"],
    [
      24,
      {
        id: "TXXX:MusicBrainz Album Artist Id",
        value: "4236acde-2ce2-441c-a3d4-38d55f1b5474",
      },
      "['ID3v2.4'].TXXX:MusicBrainz Album Artist Id",
    ],
    [
      25,
      {
        id: "TXXX:MusicBrainz Album Id",
        value: "2644f258-0619-4beb-a150-0c0069ca6699",
      },
      "['ID3v2.4'].TXXX:MusicBrainz Album Id",
    ],
    [
      26,
      {
        id: "TXXX:MusicBrainz Album Release Country",
        value: "US",
      },
      "['ID3v2.4'].TXXX:MusicBrainz Album Release Country",
    ],
    [
      27,
      {
        id: "TXXX:MusicBrainz Album Status",
        value: "official",
      },
      "['ID3v2.4'].TXXX:MusicBrainz Album Status",
    ],
    [
      28,
      {
        id: "TXXX:MusicBrainz Album Type",
        value: "album",
      },
      "['ID3v2.4'].TXXX:MusicBrainz Album Type #1",
    ],
    [
      29,
      {
        id: "TXXX:MusicBrainz Album Type",
        value: "soundtrack",
      },
      "['ID3v2.4'].TXXX:MusicBrainz Album Type #2",
    ],
    [
      30,
      {
        id: "TXXX:MusicBrainz Artist Id",
        value: "4236acde-2ce2-441c-a3d4-38d55f1b5474",
      },
      "['ID3v2.4'].MusicBrainz Artist Id",
    ],
    [
      31,
      {
        id: "TXXX:MusicBrainz Release Group Id",
        value: "afe7c5d8-f8bc-32cf-b77d-8fb8561989a7",
      },
      "['ID3v2.4'].MusicBrainz Release Group Id",
    ],
    [
      32,
      {
        id: "TXXX:MusicBrainz Release Track Id",
        value: "d87d56d0-9bd3-3199-8ff3-d03dff3abb13",
      },
      "['ID3v2.4'].MusicBrainz Release Track Id",
    ],
    [33, { id: "TXXX:PERFORMER", value: "Explosions In The Sky" }, "['ID3v2.4'].PERFORMER"],
    [34, { id: "TXXX:SCRIPT", value: "Latn" }, "['ID3v2.4'].'SCRIPT"],
    [35, { id: "TXXX:originalyear", value: "2004" }, "['ID3v2.4'].'originalyear"],
    [
      36,
      {
        id: "UFID",
        value: {
          identifier: Buffer.from([
            0x38, 0x34, 0x38, 0x35, 0x31, 0x31, 0x35, 0x30, 0x2d, 0x61, 0x31, 0x39, 0x36, 0x2d, 0x34, 0x38, 0x66, 0x61,
            0x2d, 0x61, 0x64, 0x61, 0x35, 0x2d, 0x31, 0x61, 0x30, 0x31, 0x32, 0x62, 0x31, 0x63, 0x64, 0x39, 0x65, 0x64,
          ]),
          owner_identifier: "http://musicbrainz.org",
        },
      },
      "['ID3v2.4'].UFID",
    ],
    [37, undefined, "End of metadata"],
  ];

  for (const [index, expected, message] of nativeExpected) {
    expect(native[index], message).toStrictEqual(expected);
  }

  {
    // 8: APIC
    const picTag = native[8];
    expect(picTag.id, "['ID3v2.4'].APIC #1").toBe("APIC");
    expect(picTag.value.format, "['ID3v2.4'].APIC #1 format").toBe("image/jpeg");
    expect(picTag.value.type, "['ID3v2.4'].APIC #1 tagTypes").toBe("Cover (front)");
    expect(picTag.value.description, "['ID3v2.4'].APIC #1 description").toBe("");
    expect(picTag.value.data.length, "['ID3v2.4'].APIC #1 length").toBe(75_818);
  }
});
