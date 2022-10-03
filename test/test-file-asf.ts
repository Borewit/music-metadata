import { join } from "node:path";

import { describe, test, expect } from "vitest";

import { orderTags } from "../lib";

import { Parsers } from "./metadata-parsers";
import { samplePath } from "./util";

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
