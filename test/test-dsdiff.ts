import { describe, test, expect } from "vitest";
import { join } from "node:path";

import { samplePath } from "./util";
import { Parsers } from "./metadata-parsers";

describe.each(Parsers)("parser: %s", (description, parser) => {
  test.skipIf(description === "buffer")("parse: Philips DSDIFF DSD64.dff", async () => {
    const filePath = join(samplePath, "dsdiff", "DSD64.dff");

    const metadata = await parser(filePath, "audio/dff", { duration: false });

    // format chunk information
    const format = metadata.format;

    expect(format.container).toBe("DSDIFF/DSD");
    expect(format.lossless).toBe(true);
    expect(format.tagTypes).toStrictEqual(["ID3v2.3"]);
    expect(format.numberOfChannels, "format.numberOfChannels").toBe(2);
    expect(format.bitsPerSample, "format.bitsPerSample").toBe(1);
    expect(format.sampleRate, "format.sampleRate [Hz]").toBe(2_822_400);
    expect(format.numberOfSamples, "format.numberOfSamples").toBe(300_800);
    expect(format.duration, "format.duration").toBe(300_800 / 2_822_400);
    expect(format.bitrate, "format.bitrate").toBe(5_644_800);
    expect(format.tagTypes, "TAG headers").toStrictEqual(["ID3v2.3"]);

    // ID3v2 chunk information

    const common = metadata.common;

    expect(common.artist, "common.artist").toBe("CANTUS (Tove Ramlo-Ystad) & Frode Fjellheim");
    expect(common.title, "common.title").toBe("Kyrie");
    expect(common.album, "common.album").toBe("SPES");
    expect(common.genre, "common.genre").toStrictEqual(["Choral"]);
    expect(common.track, "common.track").toStrictEqual({ no: 4, of: 12 });
  });
});
