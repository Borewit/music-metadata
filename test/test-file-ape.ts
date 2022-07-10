import { describe, test, expect } from "vitest";
import { join } from "node:path";

import { orderTags, parseFile } from "../lib";
import { Parsers } from "./metadata-parsers";
import { samplePath } from "./util";

describe("Parse APE (Monkey's Audio)", () => {
  test.each(Parsers)("parser: %s", async (parser) => {
    const filePath = join(samplePath, "monkeysaudio.ape");
    const metadata = await parser.initParser(filePath, "audio/ape");

    expect(metadata, "metadata should be defined").toBeDefined();
    expect(metadata.native, "metadata.native should be defined").toBeDefined();
    expect(metadata.native.APEv2, "metadata.native.APEv2 should be defined").toBeDefined();

    const format = metadata.format;

    expect(format.bitsPerSample, "format.bitsPerSample").toBe(16);
    expect(format.sampleRate, "format.sampleRate = 44.1 [kHz]").toBe(44_100);
    expect(format.numberOfChannels, "format.numberOfChannels 2 (stereo)").toBe(2);
    expect(format.duration, "duration [sec]").toBe(1.213_424_036_281_179_2);

    const common = metadata.common;

    expect(common.title, "common.title").toBe("07. Shadow On The Sun");
    expect(common.artist, "common.artist").toBe("Audioslave");
    expect(common.artists, "common.artists").toStrictEqual(["Audioslave", "Chris Cornell"]);
    // Used to be ['Audioslave'], but 'APEv2/Album Artist'->'albumartist' is not set in actual file!
    expect(common.albumartist, "common.albumartist").toBeUndefined();
    expect(common.album, "common.album").toBe("Audioslave");
    expect(common.year, "common.year").toBe(2002);
    expect(common.genre, "common.genre").toStrictEqual(["Alternative"]);
    expect(common.track, "common.track").toStrictEqual({ no: 7, of: null });
    expect(common.disk, "common.disk").toStrictEqual({ no: 3, of: null });
    expect(common.picture[0].format, "common.picture 0 format").toBe("image/jpeg");
    expect(common.picture[0].data.length, "common.picture 0 length").toBe(48_658);
    expect(common.picture[1].format, "common.picture 1 format").toBe("image/jpeg");
    expect(common.picture[1].data.length, "common.picture 1 length").toBe(48_658);

    const native = orderTags(metadata.native.APEv2);

    expect(native.ENSEMBLE).toStrictEqual(["Audioslave"]);
    expect(native.Artist).toStrictEqual(["Audioslave", "Chris Cornell"]);
    expect(native["Cover Art (Front)"][0].data.length, "raw cover art (front) length").toBe(48_658);
    expect(native["Cover Art (Back)"][0].data.length, "raw cover art (front) length").toBe(48_658);
  });
});

describe("Parse APEv2 header", () => {
  test("Handle APEv2 with item count to high(issue #331)", async () => {
    const filePath = join(samplePath, "mp3", "issue-331.apev2.mp3");
    const metadata = await parseFile(filePath, { duration: false });

    const format = metadata.format;

    expect(format.container, "format.container").toBe("MPEG");
    expect(format.codec, "format.codec").toBe("MPEG 1 Layer 3");
    expect(format.codecProfile, "format.codecProfile").toBe("CBR");
    expect(format.tool, "format.codecProfile").toBe("LAME 3.99r");
    expect(format.duration, "format.duration").toBeCloseTo(348.421, 1);
    expect(format.sampleRate, "format.sampleRate").toBe(44_100);
    expect(format.tagTypes, "format.tagTypes").toStrictEqual(["ID3v2.4", "APEv2", "ID3v1"]);
    expect(format.bitrate, "format.bitrate").toBe(320_000);

    const common = metadata.common;

    expect(common.artist, "common.artist").toBe("Criminal Vibes");
    expect(common.title, "common.title").toBe("Push The Feeling On (Groove Phenomenon Remix)");

    const quality = metadata.quality;

    expect(
      quality.warnings.filter((warning) => {
        return warning.message === "APEv2 Tag-header: 1 items remaining, but no more tag data to read.";
      }),
      "quality.warnings"
    ).toHaveLength(1);
  });
});
