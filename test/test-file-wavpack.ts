/* eslint-disable unicorn/consistent-function-scoping */
import { describe, test, expect } from "vitest";
import { join } from "node:path";

import { Parsers } from "./metadata-parsers";
import { samplePath } from "./util";

const wavpackSamplePath = join(samplePath, "wavpack");

describe("codec: WavPack", () => {
  const wv1 = join(
    wavpackSamplePath,
    "MusicBrainz - Beth Hart - Sinner's Prayer.wv"
  );

  test.each(Parsers)("%j", async (parser) => {
    const metadata = await parser.initParser(wv1, "audio/x-wavpack");
    const format = metadata.format;
    const common = metadata.common;

    expect(format.container, "format.container").toBe("WavPack");
    expect(format.tagTypes, "format.tagTypes").toStrictEqual(["APEv2"]);
    expect(format.duration, "format.duration").toBeCloseTo(2.123, 2);
    expect(format.codec, "format.codecProfile").toBe("PCM");

    expect(common.title, "common.title").toBe("Sinner's Prayer");
    expect(common.artists, "common.artist").toStrictEqual([
      "Beth Hart",
      "Joe Bonamassa",
    ]);
  });
});

describe("codec: DSD128", () => {
  const wv1 = join(wavpackSamplePath, "DSD128.wv");
  test.each(Parsers)("%j", async (parser) => {
    const metadata = await parser.initParser(wv1, "audio/x-wavpack");
    const format = metadata.format;

    expect(format.container, "format.container").toBe("WavPack");
    expect(format.codec, "format.codecProfile").toBe("DSD");
    expect(format.numberOfSamples, "format.numberOfSamples").toBe(564_480);
    expect(format.sampleRate, "format.sampleRate").toBe(5_644_800);
    expect(format.duration, "format.duration").toBe(0.1);
    expect(format.tagTypes, "format.tagTypes").toStrictEqual([]);
  });
});

describe("codec: DSD128 compressed", () => {
  const wv1 = join(wavpackSamplePath, "DSD128 high compression.wv");
  test.each(Parsers)("%j", async (parser) => {
    const metadata = await parser.initParser(wv1, "audio/x-wavpack");
    const format = metadata.format;

    expect(format.container, "format.container").toBe("WavPack");
    expect(format.codec, "format.codecProfile").toBe("DSD");
    expect(format.numberOfSamples, "format.numberOfSamples").toBe(564_480);
    expect(format.sampleRate, "format.sampleRate").toBe(5_644_800);
    expect(format.duration, "format.duration").toBe(0.1);
    expect(format.tagTypes, "format.tagTypes").toStrictEqual([]);
    expect(format.bitrate).toBe(4_810_400);
  });
});
