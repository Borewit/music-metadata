import { describe, test, expect } from "vitest";
import { orderTags } from "../lib";
import { join } from "node:path";
import GUID from "../lib/asf/GUID";
import { getParserForAttr } from "../lib/asf/AsfUtil";
import { DataType } from "../lib/asf/DataType";
import { Parsers } from "./metadata-parsers";
import { samplePath } from "./util";

describe("GUID", () => {
  test("should construct GUID from string", () => {
    const HeaderObject = new GUID("75B22630-668E-11CF-A6D9-00AA0062CE6C");
    const HeaderGUID = Uint8Array.from([
      0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0x00, 0xaa, 0x00, 0x62, 0xce, 0x6c,
    ]);

    expect(HeaderObject.toBin()).toStrictEqual(HeaderGUID);
  });

  test("should construct GUID from Buffer", () => {
    const GUIDData = Buffer.from([
      0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0x00, 0xaa, 0x00, 0x62, 0xce, 0x6c,
    ]);
    const GUIDString = "75B22630-668E-11CF-A6D9-00AA0062CE6C";

    expect(GUID.fromBin(GUIDData).str).toBe(GUIDString);
  });
});

/**
 * Trying Buffer.readUIntLE(0, 8)
 * Where 8 is 2 bytes longer then maximum allowed of 6
 */
describe("should be able to roughly decode a 64-bit QWord", () => {
  const tests: { raw: string; expected: number; description: string }[] = [
    {
      raw: "\u00FF\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
      expected: 0xff,
      description: "8-bit",
    },
    {
      raw: "\u00FF\u00FF\u0000\u0000\u0000\u0000\u0000\u0000",
      expected: 0xff_ff,
      description: "16-bit",
    },
    {
      raw: "\u00FF\u00FF\u00FF\u00FF\u0000\u0000\u0000\u0000",
      expected: 0xff_ff_ff_ff,
      description: "32-bit",
    },
    {
      raw: "\u00FF\u00FF\u00FF\u00FF\u00FF\u0000\u0000\u0000",
      expected: 0xff_ff_ff_ff_ff,
      description: "40-bit",
    },
    {
      raw: "\u00FF\u00FF\u00FF\u00FF\u00FF\u00FF\u0000\u0000",
      expected: 0xff_ff_ff_ff_ff_ff,
      description: "48-bit",
    },
    {
      raw: "\u00FF\u00FF\u00FF\u00FF\u00FF\u00FF\u000F\u0000",
      expected: 0xf_ff_ff_ff_ff_ff_ff,
      description: "52-bit",
    },
  ];

  test.each(tests)("%#", ({ raw, expected, description }) => {
    const buf = Buffer.from(raw, "binary");
    expect(Number(getParserForAttr(DataType.QWord)(buf)), description).toBe(expected);
  });
});

describe.each(Parsers)("parse %s", (_, parser) => {
  const asfFilePath = join(samplePath, "asf");

  test("should decode an ASF audio file (.wma)", async () => {
    const metadata = await parser(join(asfFilePath, "asf.wma"), "audio/x-ms-wma");
    expect(metadata, "metadata").toBeDefined();
    expect(metadata.native, "metadata.native").toBeDefined();
    expect(metadata.native.asf, "should include native ASF tags").toBeDefined();

    const format = metadata.format;

    expect(format.container, "format.container").toBe("ASF/audio");
    expect(format.codec, "format.codec").toBe("Windows Media Audio 9.1");
    expect(format.duration, "format.duration").toBeCloseTo(243.306, 3);
    expect(format.bitrate, "format.bitrate").toBe(192_639);

    const common = metadata.common;

    expect(common.title, "common.title").toBe("Don't Bring Me Down");
    expect(common.artist, "common.artist").toBe("Electric Light Orchestra");
    expect(common.albumartist, "common.albumartist").toBe("Electric Light Orchestra");
    expect(common.album, "common.album").toBe("Discovery");
    expect(common.year, "common.year").toBe(2001);
    expect(common.track, "common.track 9/0").toStrictEqual({
      no: 9,
      of: null,
    });
    expect(common.disk, "common.disk 0/0").toStrictEqual({
      no: null,
      of: null,
    });
    expect(common.genre, "common.genre").toStrictEqual(["Rock"]);

    const native = orderTags(metadata.native.asf);

    expect(native["WM/AlbumTitle"], "native: WM/AlbumTitle").toStrictEqual(["Discovery"]);
    expect(native["WM/BeatsPerMinute"], "native: WM/BeatsPerMinute").toStrictEqual([117]);
    expect(native.REPLAYGAIN_TRACK_GAIN, "native: REPLAYGAIN_TRACK_GAIN").toStrictEqual(["-4.7 dB"]);
  });

  test("should decode picture from", async () => {
    const filePath = join(asfFilePath, "issue_57.wma");
    const metadata = await parser(filePath, "audio/x-ms-wma");

    const asf = orderTags(metadata.native.asf);

    expect(asf["WM/Picture"][0]).toBeDefined();
    expect(asf["WM/Picture"][0].data).toBeDefined();
  });

  /**
   * Related issue: https://github.com/Borewit/music-metadata/issues/68
   */
  test("should be able to parse truncated .wma file", async () => {
    const filePath = join(asfFilePath, "13 Thirty Dirty Birds.wma");

    const { format, common, native } = await parser(filePath);

    expect(format.container, "format.container").toBe("ASF/audio");
    expect(format.codec, "format.codec").toBe("Windows Media Audio 9");
    expect(format.duration, "format.duration").toBeCloseTo(14.466, 4);
    expect(format.bitrate, "format.bitrate").toBeCloseTo(128_639, 0);

    expect(common.title, "metadata.common.title").toBe("Thirty Dirty Birds");
    expect(common.artist, "metadata.common.artist").toBe("The Red Hot Chili Peppers");
    expect(common.date, "metadata.common.date").toBe("2003");
    expect(common.label, "metadata.common.label").toStrictEqual(["Capitol"]);
    expect(common.track.no, "metadata.common.track.no").toBe(13);

    const asf = orderTags(native.asf);
    // ToDo: Contains some WM/... tags which could be parsed / mapped better

    expect(asf).toBeDefined();
  });
});
